<?php

namespace App\Exports;

use App\Models\Payment;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

class PaymentsSheet implements FromCollection, WithHeadings, WithTitle, ShouldAutoSize
{
    public function collection(): Collection
    {
        return Payment::with('client')
            ->orderByDesc('paid_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Payment $p) => [
                $p->receipt_number,
                $p->paid_at->toDateString(),
                $p->client?->name,
                $p->amount,
                $p->mode,
                $p->reference,
                $p->type,
            ]);
    }

    public function headings(): array
    {
        return ['Receipt No.', 'Date', 'Client', 'Amount (PHP)', 'Mode', 'Reference No.', 'Type'];
    }

    public function title(): string
    {
        return 'Payments';
    }
}
