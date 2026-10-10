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
| Tab on login screen | Email |
|---|---|
| Owner | owner@loverealty.com |
| Staff | staff@loverealty.com |
| Client | maria.santos@example.com (the demo client logins use the same password) |

Tip: if you already have an older copy, copy its `vendor` folder (inside `invoicify-api`) and `node_modules` folder (inside `frontend`) into this one to skip the two install commands.

## What is new in this version
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
