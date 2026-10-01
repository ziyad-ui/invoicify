<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Payment;
use Illuminate\Support\Collection;

class ReportService
{
    /** Total collected per month for the last $months months (zero-filled). */
    public function monthlyCollections(int $months = 6): array
    {
        $start = now()->startOfMonth()->subMonths($months - 1);

        $totals = Payment::where('paid_at', '>=', $start->toDateString())
            ->get(['paid_at', 'amount'])
            ->groupBy(fn (Payment $p) => $p->paid_at->format('Y-m'))
            ->map(fn (Collection $group) => round($group->sum('amount'), 2));

        return collect(range(0, $months - 1))->map(function (int $i) use ($start, $totals) {
            $month = $start->copy()->addMonths($i);

            return [
                'month' => $month->format('M'),
                'amount' => (float) ($totals[$month->format('Y-m')] ?? 0),
            ];
        })->all();
    }

    /** One row per client: what they've paid, what they still owe, and their status. */
    public function clientPerformance(): Collection
    {
        return Client::with(['property', 'invoices', 'payments'])
            ->orderBy('name')
            ->get()
            ->map(fn (Client $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'property' => $c->property?->name,
                'collected' => round($c->payments->sum('amount'), 2),
                'balance' => $c->balance,
                'dueDate' => $c->next_due_date?->toDateString(),
                'status' => $c->status,
            ])
            ->values();
    }
}
