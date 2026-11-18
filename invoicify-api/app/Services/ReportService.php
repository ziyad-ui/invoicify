<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\NotificationLog;
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
                'label' => $month->format('F Y'),
                'amount' => (float) ($totals[$month->format('Y-m')] ?? 0),
            ];
        })->all();
    }

    /**
     * What is still owed, split by how late it is (owner dashboard).
     * notDue = unpaid but not yet past its due date; the other buckets are days past due.
     */
    public function receivablesAging(): array
    {
        $today = today();
        $buckets = ['notDue' => 0.0, 'days1to30' => 0.0, 'days31to60' => 0.0, 'days60plus' => 0.0];

        Invoice::unpaid()->get(['amount', 'paid_amount', 'due_date'])->each(function (Invoice $invoice) use (&$buckets, $today) {
            $owed = $invoice->remaining;

            if ($invoice->due_date->gte($today)) {
                $buckets['notDue'] += $owed;

                return;
            }

            $late = (int) floor($invoice->due_date->diffInDays($today, true));
            $key = $late <= 30 ? 'days1to30' : ($late <= 60 ? 'days31to60' : 'days60plus');
            $buckets[$key] += $owed;
        });

        $buckets = array_map(fn ($v) => round($v, 2), $buckets);

        return $buckets + [
            'total' => round(array_sum($buckets), 2),
            // Everything due this calendar month, i.e. what the monthly installments add up to.
            'expectedThisMonth' => round((float) Invoice::whereBetween('due_date', [
                now()->startOfMonth()->toDateString(),
                now()->endOfMonth()->toDateString(),
            ])->sum('amount'), 2),
        ];
    }

    /**
     * A mixed, newest-first feed built from records that already exist (no separate log table):
     * recorded payments, reminder emails, invoices that went overdue and newly added clients.
     */
    public function recentActivity(int $limit = 8): array
    {
        $events = collect();

        Payment::with('client')->latest('paid_at')->latest('id')->limit(4)->get()->each(function (Payment $p) use ($events) {
            $events->push([
                'type' => 'payment',
                'clientId' => $p->client_id,
                'clientName' => $p->client?->name,
                'amount' => (float) $p->amount,
                // paid_at is a date; a payment recorded today shows its real time instead of midnight.
                'at' => $p->paid_at->isToday() ? $p->created_at : $p->paid_at->copy()->setTime(12, 0),
            ]);
        });

        NotificationLog::with('client')
            ->whereIn('type', ['Due Soon Reminder', 'Overdue Notice'])
            ->where('status', 'Sent')
            ->latest('sent_at')->limit(3)->get()
            ->each(function (NotificationLog $n) use ($events) {
                $events->push([
                    'type' => 'reminder',
                    'clientId' => $n->client_id,
                    'clientName' => $n->client?->name,
                    'detail' => $n->type,
                    'at' => $n->sent_at ?? $n->created_at,
                ]);
            });

        Invoice::overdue()->with('client')
            ->whereDate('due_date', '>=', today()->subDays(30))
            ->orderByDesc('due_date')->limit(3)->get()
            ->each(function (Invoice $i) use ($events) {
                $events->push([
                    'type' => 'overdue',
                    'clientId' => $i->client_id,
                    'clientName' => $i->client?->name,
                    'detail' => $i->number,
                    'amount' => $i->remaining,
                    'at' => $i->due_date->copy()->addDay()->startOfDay(),
                ]);
            });

        Client::where('created_at', '>=', now()->subDays(30))->latest()->limit(2)->get()
            ->each(function (Client $c) use ($events) {
                $events->push([
                    'type' => 'client',
                    'clientId' => $c->id,
                    'clientName' => $c->name,
                    'at' => $c->created_at,
                ]);
            });

        return $events
            ->sortByDesc(fn (array $e) => $e['at']->timestamp)
            ->take($limit)
            ->map(fn (array $e) => array_merge($e, ['at' => $e['at']->toIso8601String()]))
            ->values()
            ->all();
    }

    /** Installments paid vs. term for each client still paying, most urgent first. */
    public function planProgress(Collection $clients, int $limit = 8): array
    {
        $urgency = ['Overdue' => 0, 'Due Soon' => 1];

        return $clients
            ->where('status', '!=', 'Fully Paid')
            ->sort(fn (Client $a, Client $b) => [$urgency[$a->status] ?? 2, $a->name] <=> [$urgency[$b->status] ?? 2, $b->name])
            ->take($limit)
            ->map(fn (Client $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'paid' => $c->invoices->filter(fn (Invoice $i) => $i->isPaid())->count(),
                'term' => (int) ($c->plan?->term_months ?: $c->invoices->count()),
            ])
            ->values()
            ->all();
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
