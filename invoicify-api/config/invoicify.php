<?php

return [
    // An unpaid invoice due within this many days is shown as "Due Soon".
    'due_soon_days' => (int) env('INVOICIFY_DUE_SOON_DAYS', 7),

    // The scheduled job emails a reminder when an unpaid invoice is this close to its due date.
    'reminder_days_before' => (int) env('INVOICIFY_REMINDER_DAYS', 3),

    // While an invoice stays overdue, repeat the overdue notice this often.
    'overdue_repeat_days' => (int) env('INVOICIFY_OVERDUE_REPEAT_DAYS', 7),

    // Maximum emails sent per day (0 = no limit). Set this just under your email provider's cap,
    // e.g. 450 for a personal Gmail (about 500/day) or 280 for Brevo's free plan (300/day).
    // Once reached, the rest wait for the next scheduled run instead of failing at the provider.
    'daily_email_limit' => (int) env('INVOICIFY_DAILY_EMAIL_LIMIT', 0),

    // Where the React app lives. Used for the sign-in link in credential emails.
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    // Only used by `php artisan db:seed` to create the first (owner) login.
    'owner' => [
        'name' => env('OWNER_NAME', 'Owner'),
        'email' => env('OWNER_EMAIL'),
        'password' => env('OWNER_PASSWORD'),
    ],
];
