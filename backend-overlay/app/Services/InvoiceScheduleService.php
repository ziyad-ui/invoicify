<?php

namespace App\Services;

use App\Models\InstallmentPlan;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceScheduleService
{
    /** Create one invoice per month of the installment plan. */
    public function generate(InstallmentPlan $plan): void
    {
        $this->createRange($plan, 0, $plan->term_months, (float) $plan->monthly_amount);
    }

    /**
     * Apply a new monthly amount and/or term to an existing plan without touching history:
     *  - invoices that already received money keep their amount;
     *  - every untouched invoice takes the new monthly amount;
     *  - a longer term appends invoices, a shorter term removes trailing untouched ones.
     */
    public function reschedule(InstallmentPlan $plan, float $monthly, int $term): void
    {
        DB::transaction(function () use ($plan, $monthly, $term) {
            $invoices = $plan->invoices()->orderBy('sequence')->get();
            $current = $invoices->count();

            if ($term < $current) {
                $lastPaid = $invoices->filter(fn (Invoice $i) => $i->paid_amount > 0)->max('sequence') ?? 0;

                if ($lastPaid > $term) {
                    throw ValidationException::withMessages([
                        'term_months' => "The term can't be shorter than {$lastPaid} months, because installment #{$lastPaid} already has a payment.",
                    ]);
                }

                Invoice::whereIn('id', $invoices->slice($term)->pluck('id'))->delete();
            } elseif ($term > $current) {
                $this->createRange($plan, $current, $term, $monthly);
            }

            Invoice::where('installment_plan_id', $plan->id)
                ->where('paid_amount', 0)
                ->update(['amount' => $monthly]);

            $plan->update(['monthly_amount' => $monthly, 'term_months' => $term]);
        });
    }

    /** Create invoices for zero-based month offsets [$from, $to). */
    private function createRange(InstallmentPlan $plan, int $from, int $to, float $amount): void
    {
        for ($i = $from; $i < $to; $i++) {
            $invoice = Invoice::create([
                'client_id' => $plan->client_id,
                'installment_plan_id' => $plan->id,
                'sequence' => $i + 1,
                'amount' => $amount,
                'paid_amount' => 0,
                'due_date' => $plan->first_due_date->copy()->addMonthsNoOverflow($i),
            ]);

            $invoice->update(['number' => 'INV-'.str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT)]);
        }
    }
}
