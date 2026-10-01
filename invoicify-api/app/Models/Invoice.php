<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'number', 'client_id', 'installment_plan_id', 'sequence', 'amount', 'paid_amount',
        'due_date', 'paid_at', 'reminder_sent_at', 'overdue_notice_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'paid_amount' => 'float',
            'due_date' => 'date',
            'paid_at' => 'date',
            'reminder_sent_at' => 'datetime',
            'overdue_notice_sent_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(InstallmentPlan::class, 'installment_plan_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    public function getRemainingAttribute(): float
    {
        return max(round($this->amount - $this->paid_amount, 2), 0);
    }

    public function isPaid(): bool
    {
        return $this->remaining <= 0;
    }

    /**
     * Status is derived from the dates on every read, so it can never go
     * stale (no cron needed just to flip "Due Soon" to "Overdue").
     * Paid | Overdue | Due Soon | Upcoming
     */
    public function getStatusAttribute(): string
    {
        if ($this->isPaid()) {
            return 'Paid';
        }

        $today = today();

        if ($this->due_date->lt($today)) {
            return 'Overdue';
        }
        if ($this->due_date->lte($today->copy()->addDays(config('invoicify.due_soon_days')))) {
            return 'Due Soon';
        }

        return 'Upcoming';
    }

    /* ---- Query scopes mirroring the status rules above ---- */

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->whereColumn('paid_amount', '<', 'amount');
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->whereColumn('paid_amount', '>=', 'amount');
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->unpaid()->whereDate('due_date', '<', today());
    }

    public function scopeDueSoon(Builder $query): Builder
    {
        return $query->unpaid()
            ->whereDate('due_date', '>=', today())
            ->whereDate('due_date', '<=', today()->addDays(config('invoicify.due_soon_days')));
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->unpaid()->whereDate('due_date', '>', today()->addDays(config('invoicify.due_soon_days')));
    }
}
