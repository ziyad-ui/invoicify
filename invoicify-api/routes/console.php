<?php

use Illuminate\Support\Facades\Schedule;

// Requires a single cron entry on the server:
//   * * * * * cd /path/to/invoicify-api && php artisan schedule:run >> /dev/null 2>&1
Schedule::command('invoicify:send-notifications')->dailyAt('08:00');
