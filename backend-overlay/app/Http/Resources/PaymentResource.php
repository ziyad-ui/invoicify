<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'receiptNumber' => $this->receipt_number,
            'date' => $this->paid_at->toDateString(),
            'amount' => $this->amount,
            'mode' => $this->mode,
            'reference' => $this->reference,
            'type' => $this->type,
            'verified' => $this->verified_at !== null,
            'clientId' => $this->client_id,
            'clientName' => $this->whenLoaded('client', fn () => $this->client?->name),
            'allocations' => $this->whenLoaded('allocations', fn () => $this->allocations->map(fn ($a) => [
                'invoice' => $a->invoice?->number,
                'amount' => $a->amount,
            ])->values()),
            // Internal detail: only present when the controller loads it (never for the client portal).
            'recordedBy' => $this->whenLoaded('recorder', fn () => $this->recorder?->name),
        ];
    }
}
