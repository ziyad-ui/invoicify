<?php

return [
    // An unpaid invoice due within this many days is shown as "Due Soon".
    'due_soon_days' => (int) env('INVOICIFY_DUE_SOON_DAYS', 7),

    // The scheduled job emails a reminder when an unpaid invoice is this close to its due date.
    'reminder_days_before' => (int) env('INVOICIFY_REMINDER_DAYS', 3),

    // While an invoice stays overdue, repeat the overdue notice this often.
    'overdue_repeat_days' => (int) env('INVOICIFY_OVERDUE_REPEAT_DAYS', 7),
];
