<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client' => $this->whenLoaded('client', fn () => $this->client?->name),
            'type' => $this->type,
            'subject' => $this->subject,
            'sentAt' => $this->created_at->format('Y-m-d h:i A'),
            'status' => $this->status,
            'error' => $this->error,
        ];
    }
}
