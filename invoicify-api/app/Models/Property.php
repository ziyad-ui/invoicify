<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Property extends Model
{
    protected $fillable = ['client_id', 'name', 'type', 'total_price'];

    protected function casts(): array
    {
        return ['total_price' => 'float'];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
