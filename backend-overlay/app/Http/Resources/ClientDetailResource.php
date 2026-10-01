<?php

namespace App\Http\Resources;

use App\Models\Invoice;
use Illuminate\Http\Request;

/** Client + full invoice schedule + payment history (profile pages and the client portal). */
class ClientDetailResource extends ClientResource
{
    public function toArray(Request $request): array
    {
        // Unpaid invoices first (soonest due first), then paid ones (most recent first).
        $invoices = $this->invoices->sort(function (Invoice $a, Invoice $b) {
            if ($a->isPaid() !== $b->isPaid()) {
                return $a->isPaid() ? 1 : -1;
            }

            return $a->isPaid() ? $b->due_date <=> $a->due_date : $a->due_date <=> $b->due_date;
        })->values();

        $payments = $this->payments
            ->sortByDesc(fn ($p) => $p->paid_at->timestamp * 1000000 + $p->id)
            ->values();

        return array_merge(parent::toArray($request), [
            'invoices' => InvoiceResource::collection($invoices)->resolve($request),
            'payments' => PaymentResource::collection($payments)->resolve($request),
        ]);
    }
}
