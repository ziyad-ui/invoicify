<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\InstallmentPlan;
use App\Models\Invoice;
use App\Models\NotificationLog;
use App\Models\Payment;
use App\Models\Property;
use App\Models\User;
use App\Services\InvoiceScheduleService;
use App\Services\PaymentService;
use Illuminate\Database\Seeder;

/**
 * DEMO ONLY — run with: php artisan db:seed --class=DemoSeeder
 * Demo data mirroring the prototype (Maria, Juan, Ana, Carlos, Liza + Rico).
 * Dates are relative to "today" so the demo always shows realistic
 * Overdue / Due Soon / Current / Fully Paid statuses.
 *
 * Demo password for every account: password123  — CHANGE OR DELETE before real use.
 */
class DemoSeeder extends Seeder
{
    public function run(InvoiceScheduleService $schedule, PaymentService $payments): void
    {
        $owner = User::create([
            'name' => 'Marivic D. Juan', 'email' => 'owner@loverealty.com',
            'password' => 'password123', 'role' => User::ROLE_OWNER,
        ]);
        $staff = User::create([
            'name' => 'Marites Juan', 'email' => 'staff@loverealty.com',
            'password' => 'password123', 'role' => User::ROLE_STAFF,
        ]);

        // remaining = installments still unpaid; nextDueOffset = days from today until the next unpaid due date.
        $demo = [
            ['Maria Santos', 'maria.santos@example.com', '0917 555 0142', 'Unit 12B, Sunview Residences', 'Residential Condominium', 1850000, 8500, 12, 1, -12],
            ['Juan Dela Cruz', 'juan.delacruz@example.com', '0918 555 0987', 'Lot 4, Greenfield Homes', 'Open Lot', 950000, 12000, 12, 1, -11],
            ['Ana Reyes', 'ana.reyes@example.com', '0919 555 0231', 'Unit 5A, Palm Court Condo', 'Residential Condominium', 2100000, 9500, 24, 2, 3],
            ['Carlos Mendoza', 'carlos.mendoza@example.com', '0920 555 0456', 'Lot 9, Riverside Estates', 'Open Lot', 1200000, 15000, 12, 3, 20],
            ['Liza Fernandez', 'liza.fernandez@example.com', '0921 555 0678', 'Unit 3C, Metro Heights', 'Residential Condominium', 1650000, 13750, 12, 0, -40],
            ['Rico Villanueva', 'rico.villanueva@example.com', '0922 555 0812', 'Lot 2, Seabreeze Beach Lots', 'Beach Property', 2600000, 21500, 24, 2, 5],
        ];

        $modes = ['Bank Transfer', 'Cash', 'Check'];
        $refCounter = 1000;

        foreach ($demo as [$name, $email, $phone, $propName, $propType, $price, $monthly, $term, $remaining, $offset]) {
            $paidCount = $term - $remaining;
            $nextDue = today()->addDays($offset);

            $client = Client::create(['name' => $name, 'email' => $email, 'phone' => $phone]);
            $property = Property::create([
                'client_id' => $client->id, 'name' => $propName, 'type' => $propType, 'total_price' => $price,
            ]);
            $plan = InstallmentPlan::create([
                'client_id' => $client->id,
                'property_id' => $property->id,
                'monthly_amount' => $monthly,
                'term_months' => $term,
                'first_due_date' => $nextDue->copy()->subMonthsNoOverflow($paidCount),
            ]);
            $schedule->generate($plan);

            User::create([
                'name' => $name, 'email' => $email, 'password' => 'password123',
                'role' => User::ROLE_CLIENT, 'client_id' => $client->id,
            ]);

            // Back-fill payment history for every installment that's already paid.
            for ($i = 0; $i < $paidCount; $i++) {
                $due = $plan->first_due_date->copy()->addMonthsNoOverflow($i);
                $mode = $modes[$i % 3];
                $reference = match ($mode) {
                    'Bank Transfer' => 'BANK-'.(++$refCounter),
                    'Check' => 'CHK-'.(++$refCounter),
                    default => null,
                };

                $payments->record($client, (float) $monthly, $mode, $reference, $due->copy()->subDays(2)->toDateString(), $staff);
            }
        }

        $this->seedNotificationLog();
    }

    /**
     * Sample email history that matches the demo invoices: an overdue notice for every
     * overdue invoice, a reminder for every "Due Soon" invoice, and receipts for the
     * most recent payment of two clients. (Rico's reminder is logged as Failed so the
     * Failed state and Resend button can be demonstrated.)
     */
    private function seedNotificationLog(): void
    {
        $when = fn ($time) => $time->gt(now()) ? now() : $time; // never log a future time
        $entries = [];

        $invoices = Invoice::with('client.property')->unpaid()->orderBy('due_date')->get();

        foreach ($invoices as $invoice) {
            $client = $invoice->client;
            if (! $client) {
                continue;
            }

            $property = $client->property?->name ?? 'your property';
            $amount = number_format($invoice->remaining, 2);
            $dueLong = $invoice->due_date->format('F j, Y');

            if ($invoice->status === 'Overdue') {
                $at = $when($invoice->due_date->copy()->addDay()->setTime(9, 2));
                $entries[] = [
                    $client, $invoice, null, 'Overdue Notice',
                    "Your installment is overdue — {$property}",
                    "Our records show that your installment for {$property} ({$invoice->number}) of ₱{$amount} was due on {$dueLong} and has not been paid yet.",
                    $at, 'Sent', null,
                ];
                $invoice->update(['overdue_notice_sent_at' => $at]);
            } elseif ($invoice->status === 'Due Soon') {
                $at = $when($invoice->due_date->copy()->subDays((int) config('invoicify.reminder_days_before'))->setTime(8, 30));
                $failed = $client->email === 'rico.villanueva@example.com';
                $entries[] = [
                    $client, $invoice, null, 'Due Soon Reminder',
                    "Installment due {$invoice->due_date->format('M j')} — {$property}",
                    "This is a friendly reminder that your installment for {$property} ({$invoice->number}) of ₱{$amount} is due on {$dueLong}.",
                    $at, $failed ? 'Failed' : 'Sent',
                    $failed ? 'Connection could not be established with the mail server.' : null,
                ];
                if (! $failed) { // failed sends are retried on the next scheduled run
                    $invoice->update(['reminder_sent_at' => $at]);
                }
            }
        }

        foreach (['carlos.mendoza@example.com', 'liza.fernandez@example.com'] as $email) {
            $client = Client::where('email', $email)->first();
            $payment = $client ? Payment::where('client_id', $client->id)->latest('id')->first() : null;
            if (! $payment) {
                continue;
            }

            $entries[] = [
                $client, null, $payment, 'Payment Receipt',
                'Receipt for your payment of ₱'.number_format($payment->amount, 2),
                'We have recorded your payment of ₱'.number_format($payment->amount, 2)
                    .' received on '.$payment->paid_at->format('F j, Y').".\n\nReceipt No.: {$payment->receipt_number}\nPayment mode: {$payment->mode}",
                $when($payment->paid_at->copy()->setTime(16, 12)), 'Sent', null,
            ];
        }

        foreach ($entries as [$client, $invoice, $payment, $type, $subject, $text, $at, $status, $error]) {
            (new NotificationLog())->forceFill([
                'client_id' => $client->id,
                'invoice_id' => $invoice?->id,
                'payment_id' => $payment?->id,
                'type' => $type,
                'subject' => $subject,
                'body' => "Hello {$client->name},\n\n{$text}\n\nPayments are made directly to Love Realty (bank transfer, check, or in person at our office). Please send your proof of payment to your account officer so it can be recorded.",
                'status' => $status,
                'error' => $error,
                'sent_at' => $status === 'Sent' ? $at : null,
                'created_at' => $at,
                'updated_at' => $at,
            ])->save();
        }
    }
}
