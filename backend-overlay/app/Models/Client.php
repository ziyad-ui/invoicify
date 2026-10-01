<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'email', 'phone'];

    public function property(): HasOne
    {
        return $this->hasOne(Property::class);
    }

    public function plan(): HasOne
    {
        return $this->hasOne(InstallmentPlan::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class)->orderBy('due_date')->orderBy('id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    /* ---- Derived values (computed from the loaded invoices) ---- */

    /** Total still owed across the whole installment schedule. */
    public function getBalanceAttribute(): float
    {
        return round($this->invoices->sum(fn (Invoice $i) => $i->remaining), 2);
    }

    public function getNextDueDateAttribute(): ?\Carbon\Carbon
    {
        return $this->invoices->first(fn (Invoice $i) => ! $i->isPaid())?->due_date;
    }

    /** Overdue | Due Soon | Current | Fully Paid */
    public function getStatusAttribute(): string
    {
        if ($this->invoices->isEmpty()) {
            return 'Current';
        }

        $unpaid = $this->invoices->reject(fn (Invoice $i) => $i->isPaid());

        if ($unpaid->isEmpty()) {
            return 'Fully Paid';
        }
        if ($unpaid->contains(fn (Invoice $i) => $i->status === 'Overdue')) {
            return 'Overdue';
        }
        if ($unpaid->contains(fn (Invoice $i) => $i->status === 'Due Soon')) {
            return 'Due Soon';
        }

        return 'Current';
    }
}
