<?php

namespace App\Services;

use App\Mail\NotificationMail;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\NotificationLog;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

/**
 * Sends email notifications and keeps a log row for every attempt, so the
 * Notifications page can show Sent / Failed and staff can resend.
 * A mail failure never breaks the action that triggered it (e.g. recording a payment).
 */
class NotificationService
{
    public function sendDueSoonReminder(Invoice $invoice): NotificationLog
    {
        $client = $invoice->client;
        $property = $client->property?->name ?? 'your property';

        $body = "Hello {$client->name},\n\n"
            ."This is a friendly reminder that your installment for {$property} "
            ."({$invoice->number}) of ₱".number_format($invoice->remaining, 2)
            .' is due on '.$invoice->due_date->format('F j, Y').".\n\n"
            .$this->howToPay();

        return $this->send($client, 'Due Soon Reminder', "Installment due {$invoice->due_date->format('M j')} — {$property}", $body, $invoice);
    }

    public function sendOverdueNotice(Invoice $invoice): NotificationLog
    {
        $client = $invoice->client;
        $property = $client->property?->name ?? 'your property';

        $body = "Hello {$client->name},\n\n"
            ."Our records show that your installment for {$property} ({$invoice->number}) "
            .'of ₱'.number_format($invoice->remaining, 2).' was due on '
            .$invoice->due_date->format('F j, Y').' and has not been paid yet.'
            ."\n\nIf you have already paid, please send your proof of payment to your account officer so we can record it.\n\n"
            .$this->howToPay();

        return $this->send($client, 'Overdue Notice', "Your installment is overdue — {$property}", $body, $invoice);
    }

    /**
     * Welcome email for a newly added client: portal login (email + temporary password) and a sign-in link.
     * The saved log keeps the text WITHOUT the password, so it is never stored in the database.
     */
    public function sendClientWelcome(Client $client, string $temporaryPassword): NotificationLog
    {
        $property = $client->property?->name ?? 'your property';

        $intro = "Hello {$client->name},\n\n"
            ."Welcome to Love Realty! Your Invoicify client portal account for {$property} is ready. "
            ."Sign in to see your installment schedule, outstanding balance and payment history.\n\n"
            ."Email: {$client->email}\n"
            .'Temporary password: ';
        $outro = "\n\nFor your security you will be asked to choose your own password the first time you sign in. "
            .'Please do not share this email with anyone.';

        return $this->send(
            $client,
            'Client Welcome',
            'Welcome to Invoicify — your client portal login',
            $intro.$temporaryPassword.$outro,
            null,
            null,
            [
                'logBody' => $intro.'(sent by email only)'.$outro,
                'actionUrl' => $this->loginUrl(),
                'actionLabel' => 'Sign in to the client portal',
            ],
        );
    }

    /** Emails a staff member their new temporary password. Returns whether the email went out. */
    public function sendStaffCredentials(User $user, string $temporaryPassword): bool
    {
        if ($this->dailyLimitReached()) {
            return false;
        }

        $body = "Hello {$user->name},\n\n"
            ."Your Invoicify password was reset by the account owner. Sign in with:\n\n"
            ."Email: {$user->email}\n"
            ."Temporary password: {$temporaryPassword}\n\n"
            .'You will be asked to choose your own password when you sign in.';

        try {
            Mail::to($user->email)->send(new NotificationMail(
                'Your Invoicify password was reset',
                $body,
                $user->name,
                $this->loginUrl(),
                'Sign in to Invoicify',
            ));

            return true;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }

    public function sendPaymentReceipt(Payment $payment): NotificationLog
    {
        $payment->loadMissing(['client.property', 'allocations.invoice']);
        $client = $payment->client;

        $applied = $payment->allocations
            ->map(fn ($a) => '  • '.$a->invoice->number.' — ₱'.number_format($a->amount, 2))
            ->implode("\n");

        $body = "Hello {$client->name},\n\n"
            .'We have recorded your payment of ₱'.number_format($payment->amount, 2)
            .' received on '.$payment->paid_at->format('F j, Y').".\n\n"
            ."Receipt No.: {$payment->receipt_number}\n"
            ."Payment mode: {$payment->mode}".($payment->reference ? " ({$payment->reference})" : '')."\n"
            ."Applied to:\n{$applied}\n\n"
            .'Thank you for your payment.';

        return $this->send($client, 'Payment Receipt', 'Receipt for your payment of ₱'.number_format($payment->amount, 2), $body, null, $payment);
    }

    /** Re-send an earlier notification (creates a new log entry, keeps the original for audit). */
    public function resend(NotificationLog $log): NotificationLog
    {
        $client = $log->client;

        if (! $client || $client->trashed()) {
            return $this->recordFailure($log, 'Client has been deleted; nothing was sent.');
        }

        if (blank($client->email)) {
            return $this->recordFailure($log, 'Client has no email address on file.');
        }

        // A welcome email carried a one-time password that was never stored, so "resend" issues a fresh one.
        if ($log->type === 'Client Welcome') {
            $user = $client->user;

            if (! $user) {
                return $this->recordFailure($log, 'This client has no portal login.');
            }

            return $this->sendClientWelcome($client->loadMissing('property'), app(TemporaryPasswordService::class)->reset($user));
        }

        // Rebuild the message from current data so amounts and dates are never stale.
        $invoice = $log->invoice_id ? Invoice::with('client.property')->find($log->invoice_id) : null;
        $payment = $log->payment_id ? Payment::find($log->payment_id) : null;

        if ($log->type === 'Due Soon Reminder' && $invoice && $invoice->remaining > 0) {
            return $this->sendDueSoonReminder($invoice);
        }

        if ($log->type === 'Overdue Notice' && $invoice && $invoice->remaining > 0) {
            return $this->sendOverdueNotice($invoice);
        }

        if ($log->type === 'Payment Receipt' && $payment) {
            return $this->sendPaymentReceipt($payment);
        }

        // Invoice was paid/removed since: fall back to the original saved text.
        return $this->send($client, $log->type, $log->subject, $log->body, $invoice, $payment);
    }

    private function recordFailure(NotificationLog $log, string $reason): NotificationLog
    {
        return NotificationLog::create([
            'client_id' => $log->client_id,
            'invoice_id' => $log->invoice_id,
            'payment_id' => $log->payment_id,
            'type' => $log->type,
            'subject' => $log->subject,
            'body' => $log->body,
            'status' => 'Failed',
            'error' => $reason,
        ]);
    }

    /** True once today's successful sends reach INVOICIFY_DAILY_EMAIL_LIMIT (0 = unlimited). */
    public function dailyLimitReached(): bool
    {
        $limit = (int) config('invoicify.daily_email_limit');

        return $limit > 0
            && NotificationLog::where('status', 'Sent')->whereDate('sent_at', today())->count() >= $limit;
    }

    /**
     * @param  array{logBody?: string, actionUrl?: string, actionLabel?: string}  $options
     *         logBody: what is saved in the log when it must differ from what is emailed (e.g. hides a password).
     */
    private function send($client, string $type, string $subject, string $body, ?Invoice $invoice = null, ?Payment $payment = null, array $options = []): NotificationLog
    {
        $logBody = $options['logBody'] ?? $body;

        if ($this->dailyLimitReached()) {
            $limit = (int) config('invoicify.daily_email_limit');

            return NotificationLog::create([
                'client_id' => $client->id,
                'invoice_id' => $invoice?->id,
                'payment_id' => $payment?->id,
                'type' => $type,
                'subject' => $subject,
                'body' => $logBody,
                'status' => 'Failed',
                'error' => "Daily email limit of {$limit} reached. Use Resend tomorrow, or raise INVOICIFY_DAILY_EMAIL_LIMIT / move to a larger email service.",
            ]);
        }

        $log = NotificationLog::create([
            'client_id' => $client->id,
            'invoice_id' => $invoice?->id,
            'payment_id' => $payment?->id,
            'type' => $type,
            'subject' => $subject,
            'body' => $logBody,
            'status' => 'Pending',
        ]);

        try {
            Mail::to($client->email)->send(new NotificationMail($subject, $body, $client->name, $options['actionUrl'] ?? null, $options['actionLabel'] ?? null));
            $log->update(['status' => 'Sent', 'sent_at' => now()]);
        } catch (Throwable $e) {
            report($e);
            $log->update(['status' => 'Failed', 'error' => Str::limit($e->getMessage(), 500)]);
        }

        return $log;
    }

    private function loginUrl(): string
    {
        // FRONTEND_URL may list several origins (for CORS); links use the first one.
        $origin = trim(explode(',', (string) config('invoicify.frontend_url'))[0]);

        return rtrim($origin, '/').'/login';
    }

    private function howToPay(): string
    {
        return 'Payments are made directly to Love Realty (bank transfer, check, or in person at our office). '
            .'Please send your proof of payment to your account officer so it can be recorded.';
    }
}
