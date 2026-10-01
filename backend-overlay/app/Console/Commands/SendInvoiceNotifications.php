<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendInvoiceNotifications extends Command
{
    protected $signature = 'invoicify:send-notifications';

    protected $description = 'Email due-soon reminders and overdue notices for unpaid invoices';

    public function handle(NotificationService $notifications): int
    {
        $reminders = 0;
        $overdue = 0;

        // 1) Reminders: unpaid, due within N days, not reminded yet.
        $dueSoon = Invoice::unpaid()
            ->whereNull('reminder_sent_at')
            ->whereDate('due_date', '>=', today())
            ->whereDate('due_date', '<=', today()->addDays(config('invoicify.reminder_days_before')))
            ->with('client.property')
            ->get();

        foreach ($dueSoon as $invoice) {
            if (! $invoice->client) {
                continue; // archived client
            }
            $log = $notifications->sendDueSoonReminder($invoice);
            if ($log->status === 'Sent') { // failed sends are retried on the next run
                $invoice->update(['reminder_sent_at' => now()]);
                $reminders++;
            }
        }

        // 2) Overdue notices: unpaid and past due; first notice, then repeated every N days.
        $late = Invoice::overdue()
            ->where(function ($q) {
                $q->whereNull('overdue_notice_sent_at')
                    ->orWhere('overdue_notice_sent_at', '<=', now()->subDays(config('invoicify.overdue_repeat_days')));
            })
            ->with('client.property')
            ->get();

        foreach ($late as $invoice) {
            if (! $invoice->client) {
                continue;
            }
            $log = $notifications->sendOverdueNotice($invoice);
            if ($log->status === 'Sent') {
                $invoice->update(['overdue_notice_sent_at' => now()]);
                $overdue++;
            }
        }

        $this->info("Sent {$reminders} reminder(s) and {$overdue} overdue notice(s).");

        return self::SUCCESS;
    }
}
