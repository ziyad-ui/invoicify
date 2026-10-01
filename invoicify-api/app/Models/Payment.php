<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    /** Payments are made outside Invoicify; these are the ways staff can record them. */
    public const MODES = ['Cash', 'Bank Transfer', 'Check'];

    protected $fillable = [
        'receipt_number', 'client_id', 'amount', 'mode', 'reference', 'type',
        'paid_at', 'recorded_by', 'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'paid_at' => 'date',
            'verified_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class)->withTrashed();
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }
}
