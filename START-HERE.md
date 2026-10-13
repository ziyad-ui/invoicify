# Invoicify - quick start (on your own computer)

Everything is already set up for local use: the settings file (`.env`), the empty database file, and the demo data loader.
You only need **PHP**, **Composer** and **Node.js** installed (you already have them if Invoicify ran on your PC before).

## 1. Open it
Unzip anywhere (for example `D:\Apps\invoicify-main`), then in VS Code choose **File -> Open Folder** and pick the `invoicify-main` folder.
Open two terminals (Terminal -> New Terminal, then the "+" button for a second one).

## 2. Terminal 1 - the API (backend)
```powershell
cd invoicify-api
composer install
php artisan migrate:fresh --seed --seeder=DemoSeeder
php artisan serve
```
Leave it running. It listens on http://localhost:8000

## 3. Terminal 2 - the website (frontend)
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## 4. Sign in (demo accounts, password for all: `password123`)
| Account type (detected automatically from the email) | Email |
|---|---|
| Owner | owner@loverealty.com |
| Staff | staff@loverealty.com |
| Client | maria.santos@example.com (the demo client logins use the same password) |

Tip: if you already have an older copy, copy its `vendor` folder (inside `invoicify-api`) and `node_modules` folder (inside `frontend`) into this one to skip the two install commands.

## What is new in this version
- **Smart sign-in** (no Owner/Staff/Client tabs), top-right **notification bell** and **hamburger menu** (Profile, Settings, About) for every role
- Clients: status filter, **Archives** (restore / delete permanently), edit opens directly, auto-calculated monthly amount, tabbed client page
- New clients are **emailed their portal login automatically**
- Staff: edit, reset (emailed) and **delete**; line-graph report, labelled dashboard chart
- Set `FRONTEND_URL` in `invoicify-api/.env` so the email's sign-in link points at your site

### Earlier changes
- Clients -> **Import Spreadsheet** (add many clients from an Excel/CSV file)
- Owner -> **Staff** page (add staff, reset password, deactivate)
- **Change password** link for everyone (temporary passwords must be changed at first sign-in)
- Client page -> **Reset Portal Password**
- Daily email cap and email-service setup (see DEPLOYMENT.md)

## Real emails
Right now emails are only written to `invoicify-api/storage/logs/laravel.log`. To send real ones, edit `invoicify-api/.env` (see DEPLOYMENT.md, "Email delivery"), then run `php artisan config:clear` and restart the API.

## Putting it online for real use
Follow **DEPLOYMENT.md**. For an empty production install do NOT use the demo seeder - put `OWNER_EMAIL` and `OWNER_PASSWORD` in `.env` and run `php artisan db:seed --force`.

NOTE: the `.env` in this zip is for local demo use only. On a real server, create a fresh one from `.env.production.example` and run `php artisan key:generate`.

---

## Forgot password

The sign-in page has a **Forgot password?** link. The person enters their account email, receives a one-time link
(valid 60 minutes), and chooses a new password at `/reset-password`. This works for Owner, Staff and Client accounts.

- **Local testing (default):** `MAIL_MAILER=log` means the email is not really sent. Open
  `invoicify-api/storage/logs/laravel.log`, find the "Reset your Invoicify password" message and copy the
  `http://localhost:5173/reset-password?...` link into your browser.
- **Real emails:** set `MAIL_MAILER=smtp` and the `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`,
  `MAIL_FROM_ADDRESS` values in `invoicify-api/.env` (for Gmail, use an App Password), then run
  `php artisan config:clear` and restart `php artisan serve`.
- `FRONTEND_URL` in `invoicify-api/.env` decides the address used inside the link. Change it when you deploy.

---

## Property map pins (new in V4)

Staff and owners can drop an optional map pin when adding or editing a client, and clients see it under
**Property Location** in their portal. It uses Leaflet + OpenStreetMap, so there is no API key and nothing to pay for.

**If you already have V3 running, update with:**
```powershell
# backend  (invoicify-api)
php artisan migrate            # adds latitude, longitude, address, location_notes to `properties`

# frontend (frontend)
npm install                    # installs the new "leaflet" package
```
For fresh demo data with sample pins, run `php artisan migrate:fresh --seed --seeder=DemoSeeder` instead
(all demo clients get a pin except Liza Fernandez, so you can see the "not pinned yet" screen).

The map needs an internet connection to load tiles and to search addresses (OpenStreetMap's free Nominatim service).
