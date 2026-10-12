# Invoicify — Backend (Laravel REST API)

This folder is an **overlay**: it contains only the Invoicify-specific files, meant to sit on top of
a fresh Laravel install. You do not need vendor/ or a working artisan file inside this folder itself —
`setup.ps1` builds that part for you.

## Requirements
PHP 8.2+, Composer, MySQL (XAMPP/Laragon is fine).

## Setup — Windows (recommended path)

1. Extract this zip so `invoicify-backend-overlay` sits **next to** (not inside) the project folder
   you want the API built in, e.g.:
   ```
   INVOICIFY SYSTEM\
     invoicify-backend-overlay\   <- this zip, extracted here
     invoicify-api\               <- setup.ps1 will create/use this
     invoicify\                   <- the frontend, from the other zip
   ```
2. Open PowerShell in `invoicify-backend-overlay` and run:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\setup.ps1
   ```
   This creates the Laravel project (or reuses one that's already there), installs
   `laravel/sanctum` and a PHP-8.2-compatible `maatwebsite/excel`, and copies every file
   in this overlay on top — all in one run, so there's no command to mistype.
3. Follow the 3 steps it prints at the end: edit `.env`, `php artisan migrate --seed`, `php artisan serve`.

Installing somewhere other than the default sibling `invoicify-api` folder:
`.\setup.ps1 -Target "C:\path\to\invoicify-api"`

## Setup — manual / macOS / Linux
```bash
composer create-project laravel/laravel:^12.0 invoicify-api
cd invoicify-api
composer require laravel/sanctum
composer require maatwebsite/excel:3.1.70   # 4.x needs PHP 8.3+
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Copy this overlay's files over the project (allow overwrite when asked):
cp -r <path-to-overlay>/* .

php artisan migrate --seed
php artisan serve          # API at http://localhost:8000/api
```

Demo accounts (password `password123` for all): `owner@loverealty.com`, `staff@loverealty.com`,
`juan.delacruz@example.com` (client). **Change or delete these before any real use.**

## Verify it works (do this first)
```bash
php artisan route:list --path=api   # should list ~16 routes
php artisan test                    # 5 feature tests: roles, payment allocation, validation, password change
```
Tests run against SQLite in-memory (`.env.testing`, already in this overlay) so they never touch your
real MySQL data. If `php artisan test` errors about `pdo_sqlite`, enable `extension=pdo_sqlite` in
your `php.ini` and restart.

## Email notifications
* Sent when a payment is recorded (receipt) and by the scheduled command `php artisan invoicify:send-notifications`
  (due-soon reminders N days before due date, overdue notices repeated every N days).
* Every attempt is logged (Sent / Failed) and shown on the Notifications page; **Resend** creates a new attempt.
* `MAIL_MAILER=log` only writes emails to `storage/logs/laravel.log`. Switch to SMTP for real delivery.
* Scheduling needs one cron entry (Linux) or a Task Scheduler job (Windows) running `php artisan schedule:run` every minute.

## API overview
| Method & path | Who | Purpose |
|---|---|---|
| POST `/api/login` | public | `{email, password}` → `{token, user}` (role comes from the account) |
| GET `/api/auth/check-role?email=` | public, throttled | `{role}` — only drives the login screen hint |
| POST `/api/user/update-profile`, `/update-email`, `/change-password` | any | self-service; email/password need `current_password` |
| GET `/api/me`, POST `/api/logout` | any | session |
| PUT `/api/password` | any | change your own password (`current_password`, `password`, `password_confirmation`) |
| GET `/api/dashboard` | owner, staff | stats (revenue figures owner-only) |
| GET/POST `/api/clients`, GET/PUT/DELETE `/api/clients/{id}` | owner, staff | client + property + installment plan + invoice schedule |
| POST `/api/clients/{id}/payments` | owner, staff | record an externally-made payment |
| GET `/api/invoices?status=` | owner, staff | invoices across clients |
| GET `/api/payments` | owner, staff | transaction history |
| GET `/api/notifications`, POST `/api/notifications/{id}/resend` | owner, staff | email activity |
| GET `/api/reports/summary`, `/api/reports/export` | **owner** | report + Excel download |
| GET `/api/portal/me`, `/api/portal/notifications` | client | the client's own record / emails sent to them |
| GET `/api/clients?archived=1`, POST `/api/clients/{id}/restore` | owner, staff | archives |
| DELETE `/api/clients/{id}/permanent` | **owner** | erase an archived client |
| DELETE `/api/staff/{id}` | **owner** | delete a staff login (never the owner) |

## First login for a new client
`POST /api/clients` creates the client, property, installment plan, full invoice schedule, **and** a
portal login with a random temporary password — returned exactly once in the response
(`temporaryPassword`) for staff to hand over. That account's `mustChangePassword` flag comes back
`true` on login; the frontend doesn't act on it yet (see "Next frontend step" below), but the
endpoint to change it, `PUT /api/password`, already exists and is tested.

## Business rules enforced here
* No online payments — payments are only **recorded** (Cash, Bank Transfer, Check); reference no. required for non-cash and must be unique.
* A payment is applied to the oldest unpaid invoice first and can span several; it can't exceed the balance owed.
* Invoice status (Paid / Due Soon / Overdue / Upcoming) is derived from dates on every read — never stale.
* A client with an outstanding balance can't be archived. Archiving keeps history and disables the portal login.
* Role checks (`role:` middleware) run on the server for every route.

## Known limits / next steps
* Lists (clients, invoices, payments) return everything (capped at 1000) — add pagination if data grows.
* Money uses decimal columns with float arithmetic rounded to 2 places; fine for this scale.
* Tokens expire after 8 hours. There's no "forgot password" flow (a client who's locked out needs
  staff to reset them manually in `tinker` for now) — only "change my known password" is built.
* **Next frontend step:** the login response includes `mustChangePassword`; the frontend doesn't
  redirect on it yet. Wire that up before handing out temporary passwords for real, otherwise a new
  client can keep using the temporary one indefinitely.
* This has been checked for syntax and logic by hand and a static brace/import sweep, but **not
  run** (no PHP/Composer/internet in the environment that built it). Run the verify steps above
  before trusting it.
