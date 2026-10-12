<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Summary shape used in lists. Field names/shape intentionally match what the
 * React app already consumed as mock data, so the UI didn't need reworking.
 * Requires: property, plan, invoices to be eager-loaded.
 */
class ClientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $property = $this->property;
        $plan = $this->plan;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'property' => $property ? [
                'name' => $property->name,
                'type' => $property->type,
                'totalPrice' => (float) $property->total_price,
            ] : null,
            'plan' => $plan ? [
                'monthly' => (float) $plan->monthly_amount,
                'termMonths' => $plan->term_months,
                'startDate' => $plan->first_due_date->toDateString(),
            ] : null,
            'balance' => $this->balance,
            'dueDate' => $this->next_due_date?->toDateString(),
            'status' => $this->status,
            'archivedAt' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
