<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->number,              // INV-00012 (display id)
            'installment' => $this->sequence,
            'period' => $this->due_date->format('F Y'),
            'amount' => $this->amount,
            'paidAmount' => $this->paid_amount,
            'dueDate' => $this->due_date->toDateString(),
            'status' => $this->status,
            'clientId' => $this->client_id,
            'clientName' => $this->whenLoaded('client', fn () => $this->client->name),
        ];
    }
}
