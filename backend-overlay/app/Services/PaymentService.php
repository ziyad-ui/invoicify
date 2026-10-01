<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    /**
     * Record a payment that was made OUTSIDE Invoicify (cash, bank transfer
     * or check) and verified by staff. The amount is applied to the client's
     * oldest unpaid invoices first, spilling over into the next one if needed.
     *
     * Runs in a transaction so a payment is never half-applied.
     */
    public function record(
        Client $client,
        float $amount,
        string $mode,
        ?string $reference,
        $paidAt,
        ?User $recorder = null,
    ): Payment {
        return DB::transaction(function () use ($client, $amount, $mode, $reference, $paidAt, $recorder) {
            $invoices = Invoice::where('client_id', $client->id)
                ->unpaid()
                ->orderBy('due_date')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($invoices->isEmpty()) {
                throw ValidationException::withMessages([
                    'amount' => 'This client has no outstanding invoices.',
                ]);
            }

            $amount = round($amount, 2);
            $outstanding = round($invoices->sum(fn (Invoice $i) => $i->remaining), 2);

            if ($amount - $outstanding > 0.005) {
                throw ValidationException::withMessages([
                    'amount' => 'Amount exceeds the outstanding balance of ₱'.number_format($outstanding, 2).'.',
                ]);
            }

            $firstRemaining = $invoices->first()->remaining;

            $type = match (true) {
                $amount >= $outstanding - 0.005 => 'Final Payment',
                $amount >= $firstRemaining - 0.005 => 'Full Payment',
                default => 'Partial Payment',
            };

            $payment = Payment::create([
                'client_id' => $client->id,
                'amount' => $amount,
                'mode' => $mode,
                'reference' => $reference,
                'type' => $type,
                'paid_at' => $paidAt,
                'recorded_by' => $recorder?->id,
                'verified_at' => now(), // recorded by authorized staff = verified
            ]);

            $payment->update([
                'receipt_number' => sprintf('RCPT-%s-%06d', now()->format('Y'), $payment->id),
            ]);

            $left = $amount;
            foreach ($invoices as $invoice) {
                if ($left <= 0.004) {
                    break;
                }

                $apply = min($invoice->remaining, $left);
                $invoice->paid_amount = round($invoice->paid_amount + $apply, 2);
                if ($invoice->isPaid()) {
                    $invoice->paid_at = $paidAt;
                }
                $invoice->save();

                PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'invoice_id' => $invoice->id,
                    'amount' => $apply,
                ]);

                $left = round($left - $apply, 2);
            }

            return $payment;
        });
    }
}
