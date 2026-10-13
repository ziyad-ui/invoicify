<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Property extends Model
{
    protected $fillable = [
        'client_id', 'name', 'type', 'total_price',
        'latitude', 'longitude', 'address', 'location_notes',
    ];

    protected function casts(): array
    {
        return [
            'total_price' => 'float',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    /** True when staff have dropped a map pin for this property. */
    public function hasLocation(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
