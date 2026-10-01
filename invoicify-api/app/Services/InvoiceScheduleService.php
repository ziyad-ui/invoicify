<?php

namespace App\Services;

use App\Models\InstallmentPlan;
use App\Models\Invoice;

class InvoiceScheduleService
{
    /** Create one invoice per month of the installment plan. */
    public function generate(InstallmentPlan $plan): void
    {
        for ($i = 0; $i < $plan->term_months; $i++) {
            $invoice = Invoice::create([
                'client_id' => $plan->client_id,
                'installment_plan_id' => $plan->id,
                'sequence' => $i + 1,
                'amount' => $plan->monthly_amount,
                'paid_amount' => 0,
                'due_date' => $plan->first_due_date->copy()->addMonthsNoOverflow($i),
            ]);

            $invoice->update(['number' => 'INV-'.str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT)]);
        }
    }
}
