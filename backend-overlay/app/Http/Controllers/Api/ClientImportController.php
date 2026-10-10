<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\User;
use App\Services\ClientOnboardingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use Throwable;

/**
 * POST /api/clients/import — bulk-create clients from an .xlsx / .xls / .csv file.
 *
 * All-or-nothing: every row is checked first; if any row has a problem NOTHING is
 * imported and the problems are returned per row, so the file can be fixed and
 * uploaded again without creating duplicates.
 */
class ClientImportController extends Controller
{
    private const MAX_ROWS = 200;       // each client = 1 password hash + N invoices, so keep batches modest
    private const MAX_ERRORS_SHOWN = 50;

    private const REQUIRED = [
        'name', 'email', 'property_name', 'property_type',
        'total_price', 'monthly_amount', 'term_months', 'first_due_date',
    ];

    /** Alternative column titles people commonly use -> our canonical column. */
    private const ALIASES = [
        'full_name' => 'name', 'client' => 'name', 'client_name' => 'name',
        'email_address' => 'email',
        'mobile' => 'phone', 'phone_number' => 'phone', 'contact' => 'phone', 'contact_number' => 'phone',
        'property' => 'property_name', 'unit' => 'property_name',
        'type' => 'property_type',
        'price' => 'total_price', 'contract_price' => 'total_price',
        'monthly' => 'monthly_amount', 'monthly_payment' => 'monthly_amount', 'monthly_installment' => 'monthly_amount',
        'term' => 'term_months', 'months' => 'term_months',
        'start_date' => 'first_due_date', 'first_payment' => 'first_due_date', 'first_due' => 'first_due_date',
    ];

    public function store(Request $request, ClientOnboardingService $onboarding): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:5120'],
        ]);

        set_time_limit(300);

        try {
            $raw = $this->readRows($request->file('file'));
        } catch (Throwable $e) {
            report($e);

            return $this->fail("That file couldn't be read. Please upload an .xlsx or .csv file made from the template.");
        }

        // The header is the first row that has anything in it.
        $headerIndex = null;
        foreach ($raw as $i => $cells) {
            if ($this->rowHasData($cells)) {
                $headerIndex = $i;
                break;
            }
        }
        if ($headerIndex === null) {
            return $this->fail('The file is empty.');
        }

        $header = array_map(fn ($h) => $this->canonicalHeader($h), $raw[$headerIndex]);

        $missing = array_values(array_diff(self::REQUIRED, $header));
        if ($missing) {
            $names = implode(', ', array_map(fn ($k) => ucwords(str_replace('_', ' ', $k)), $missing));

            return $this->fail("The file is missing these columns: {$names}. Download the template to see the expected columns.");
        }

        // Spreadsheet row number => cleaned values
        $records = [];
        foreach ($raw as $i => $cells) {
            if ($i <= $headerIndex) {
                continue;
            }
            $row = [];
            foreach ($header as $col => $key) {
                if ($key !== '') {
                    $row[$key] = $this->clean($cells[$col] ?? null);
                }
            }
            if (collect($row)->every(fn ($v) => $v === null)) {
                continue; // blank row
            }
            $records[$i + 1] = $this->normalize($row);
        }

        if (! $records) {
            return $this->fail('The file has a header but no client rows.');
        }
        if (count($records) > self::MAX_ROWS) {
            return $this->fail('That file has '.count($records).' clients. Please import at most '.self::MAX_ROWS.' at a time.');
        }

        // Emails that already exist (including archived clients) or repeat inside the file.
        $emails = collect($records)->pluck('email')->filter()->unique()->values()->all();
        $taken = array_flip(array_map('strtolower', array_merge(
            Client::withTrashed()->whereIn('email', $emails)->pluck('email')->all(),
            User::whereIn('email', $emails)->pluck('email')->all(),
        )));

        $rowErrors = [];
        $seen = [];
        foreach ($records as $rowNumber => $row) {
            $validator = Validator::make($row, [
                'name' => ['required', 'string', 'max:120'],
                'email' => ['required', 'email', 'max:190'],
                'phone' => ['nullable', 'string', 'max:30'],
                'property_name' => ['required', 'string', 'max:160'],
                'property_type' => ['required', 'string', 'max:80'],
                'total_price' => ['required', 'numeric', 'min:0'],
                'monthly_amount' => ['required', 'numeric', 'min:1'],
                'term_months' => ['required', 'integer', 'min:1', 'max:120'],
                'first_due_date' => ['required', 'date'],
            ]);

            $problems = $validator->errors()->all();

            $email = $row['email'] ?? null;
            if ($email && ! $validator->errors()->has('email')) {
                if (isset($taken[$email])) {
                    $problems[] = 'A client or user with this email already exists.';
                } elseif (isset($seen[$email])) {
                    $problems[] = "This email is repeated (first used on row {$seen[$email]}).";
                }
                $seen[$email] ??= $rowNumber;
            }

            if ($problems) {
                $rowErrors[] = ['row' => $rowNumber, 'name' => $row['name'] ?? null, 'errors' => $problems];
            }
        }

        if ($rowErrors) {
            return response()->json([
                'message' => 'No clients were imported. Fix the '.count($rowErrors).' row(s) below and upload the file again.',
                'rowErrors' => array_slice($rowErrors, 0, self::MAX_ERRORS_SHOWN),
                'moreErrors' => max(0, count($rowErrors) - self::MAX_ERRORS_SHOWN),
            ], 422);
        }

        // Everything checked out — create it all in one go.
        $created = [];
        $pastDue = 0;

        DB::transaction(function () use ($records, $onboarding, &$created, &$pastDue) {
            foreach ($records as $row) {
                [$client, $password] = $onboarding->create($row);
                $created[] = [
                    'name' => $client->name,
                    'email' => $client->email,
                    'property' => $row['property_name'],
                    'temporaryPassword' => $password,
                ];
                if (Carbon::parse($row['first_due_date'])->lt(today())) {
                    $pastDue++;
                }
            }
        });

        $count = count($created);

        return response()->json([
            'message' => $count === 1 ? '1 client was imported.' : "{$count} clients were imported.",
            'imported' => $count,
            'pastDueCount' => $pastDue,
            'clients' => $created, // temporary passwords: returned once, never stored in plain text
        ], 201);
    }

    private function fail(string $message): JsonResponse
    {
        return response()->json(['message' => $message], 422);
    }

    /** @return array<int, array<int, mixed>> raw cell values, rows and columns 0-indexed */
    private function readRows(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        $extension = strtolower($file->getClientOriginalExtension());

        if (in_array($extension, ['csv', 'txt'], true)) {
            $reader = IOFactory::createReader('Csv');
            $reader->setInputEncoding(Csv::GUESS_ENCODING);
        } else {
            $reader = IOFactory::createReaderForFile($path);
        }
        $reader->setReadDataOnly(true);

        // (null value, calculate formulas, DON'T format — so dates arrive as Excel serial numbers)
        return $reader->load($path)->getActiveSheet()->toArray(null, true, false, false);
    }

    private function rowHasData(array $cells): bool
    {
        foreach ($cells as $cell) {
            if ($cell !== null && trim((string) $cell) !== '') {
                return true;
            }
        }

        return false;
    }

    private function canonicalHeader(mixed $title): string
    {
        $key = strtolower(trim((string) $title));
        $key = trim((string) preg_replace('/[^a-z0-9]+/', '_', $key), '_');

        return self::ALIASES[$key] ?? $key;
    }

    private function clean(mixed $value): mixed
    {
        if (is_string($value)) {
            $value = trim($value);

            return $value === '' ? null : $value;
        }
        if (is_float($value) && floor($value) === $value && abs($value) < 1e15) {
            return (int) $value; // 12.0 -> 12
        }

        return $value;
    }

    private function normalize(array $row): array
    {
        foreach (['name', 'email', 'phone', 'property_name', 'property_type'] as $field) {
            if (isset($row[$field])) {
                $row[$field] = trim((string) $row[$field]);
            }
        }

        if (isset($row['email'])) {
            $row['email'] = strtolower($row['email']);
        }

        // Excel drops the leading 0 of Philippine mobile numbers (09171234567 -> 9171234567).
        if (isset($row['phone']) && preg_match('/^9\d{9}$/', $row['phone'])) {
            $row['phone'] = '0'.$row['phone'];
        }

        // Allow "₱1,850,000.00", "PHP 8,500", etc.
        foreach (['total_price', 'monthly_amount'] as $field) {
            if (isset($row[$field]) && is_string($row[$field])) {
                $stripped = preg_replace('/[^0-9.\-]/', '', $row[$field]);
                $row[$field] = $stripped === '' ? null : $stripped;
            }
        }

        $row['first_due_date'] = $this->normalizeDate($row['first_due_date'] ?? null);

        return $row;
    }

    /** Accepts real Excel dates, YYYY-MM-DD, "Nov 1, 2026", and m/d/Y (or d/m/Y when the first number is over 12). */
    private function normalizeDate(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        try {
            if (is_int($value) || is_float($value) || (is_string($value) && is_numeric($value))) {
                $serial = (float) $value;
                if ($serial < 1 || $serial > 80000) {
                    return (string) $value; // not a plausible Excel date; the validator will reject it
                }

                return Carbon::instance(ExcelDate::excelToDateTimeObject($serial))->toDateString();
            }

            $text = trim((string) $value);

            if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})$#', $text, $m)) {
                $first = (int) $m[1];
                $second = (int) $m[2];
                [$month, $day] = $first > 12 ? [$second, $first] : [$first, $second];
                if (! checkdate($month, $day, (int) $m[3])) {
                    return $text;
                }

                return Carbon::create((int) $m[3], $month, $day)->toDateString();
            }

            return Carbon::parse($text)->toDateString();
        } catch (Throwable) {
            return (string) $value;
        }
    }
}
