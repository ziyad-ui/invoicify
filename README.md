# Invoicify — Full System (Frontend + Backend)

Client invoicing and payment monitoring system for **Love Realty** (Tagum City).

```
invoicify-system/
  backend-overlay/    Laravel API source (models, controllers, migrations, tests) + its own setup.ps1
  frontend/            React + Vite app, already wired to call the API
  setup.ps1            <- run this one script to set both up
```

`backend-overlay/` is **not itself a runnable Laravel project** — it's the Invoicify-specific files
that get laid on top of a freshly generated one. `setup.ps1` creates that Laravel project (at
`invoicify-api/`, alongside this README) and copies the overlay onto it automatically, so you don't
handle that step by hand.

## Requirements
- PHP 8.2+ and Composer (e.g. via XAMPP + getcomposer.org)
- Node.js LTS (includes npm)
- MySQL (XAMPP includes this too)

## Setup (Windows)

1. Extract this zip anywhere, e.g. `Documents\INVOICIFY SYSTEM\invoicify-system`.
2. Open PowerShell **inside** `invoicify-system` and run:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\setup.ps1
   ```
   This installs both the backend's Composer packages and the frontend's npm packages in one go,
   and prints the handful of manual steps left (creating the database, filling in `.env`, and
   starting both servers) at the end.
3. Follow what it prints. In short:
   ```powershell
   # Terminal 1 — backend
   cd invoicify-api
   php artisan migrate --seed
   php artisan test          # should show all tests passing
   php artisan serve

   # Terminal 2 — frontend
   cd frontend
   npm run dev
   ```
4. Open the frontend's local URL (usually `http://localhost:5173`) and sign in.
   Demo accounts (password `password123` for all): `owner@loverealty.com`,
   `staff@loverealty.com`, `juan.delacruz@example.com` (client).
   **Change or delete these before any real/graded use.**

If you're not on Windows, or prefer to run things by hand, see `backend-overlay/README.md` and
`frontend/README.md` for the manual, step-by-step version of the same setup.

## Where things stand
This was assembled and reviewed for correctness (syntax, matching imports/endpoints, logic) but
**has not been executed** by whoever built it — there was no PHP, Node, or internet access available
to actually run it end to end. Run the verify steps above (`php artisan test` especially) before
trusting it, and report back anything that errors.

## What's built
- **Auth:** role-based login (Owner / Staff / Client) with Laravel Sanctum tokens; server-side role
  checks on every route, not just hidden UI.
- **Clients:** add a client (auto-generates their property, installment plan, full invoice schedule,
  and a portal login with a one-time temporary password), search, edit, archive (blocked while a
  balance remains).
- **Payments:** recorded manually (Cash / Bank Transfer / Check — no online payment processing, per
  the project's business rules), applied oldest-invoice-first, capped at the outstanding balance.
- **Invoices:** Paid / Due Soon / Overdue / Upcoming status computed from dates on every read.
- **Notifications:** payment receipts sent automatically; a daily scheduled job emails due-soon
  reminders and overdue notices; every attempt logged with Sent/Failed and a Resend action.
- **Reports:** owner-only dashboard totals, monthly collections chart, per-client performance table,
  and an Excel (.xlsx) export.
- **Client Portal:** a client only ever sees their own record — enforced server-side, not just by
  hiding the UI.
