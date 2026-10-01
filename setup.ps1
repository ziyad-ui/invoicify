<#
 Invoicify - one-shot setup for BOTH the backend and the frontend.

 Run this from inside the "invoicify-system" folder (the one this file
 is in) in Windows PowerShell:

 Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
 .\setup.ps1

 What it does:
 1. Backend: creates/updates a Laravel 12 project at .\invoicify-api,
 installs laravel/sanctum + a PHP-8.2-compatible maatwebsite/excel,
 and copies backend-overlay\ on top of it.
 2. Frontend: copies frontend\.env.example -> frontend\.env (if missing)
 and runs `npm install` inside frontend\.

 Flags:
 -SkipBackend only set up the frontend
 -SkipFrontend only set up the backend
#>

param(
 [switch]$SkipBackend,
 [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Require-Command($name, $hint) {
 if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
 Write-Host "ERROR: '$name' was not found on PATH. $hint" -ForegroundColor Red
 exit 1
 }
}

if (-not $SkipBackend) {
 Write-Host "=====================================" -ForegroundColor Cyan
 Write-Host " Setting up the BACKEND (Laravel)" -ForegroundColor Cyan
 Write-Host "=====================================" -ForegroundColor Cyan
 Push-Location (Join-Path $Root "backend-overlay")
 try {
 & .\setup.ps1
 if ($LASTEXITCODE -ne 0) { throw "Backend setup script exited with an error (see above)." }
 } finally {
 Pop-Location
 }
}

if (-not $SkipFrontend) {
 Write-Host ""
 Write-Host "=====================================" -ForegroundColor Cyan
 Write-Host " Setting up the FRONTEND (React)" -ForegroundColor Cyan
 Write-Host "=====================================" -ForegroundColor Cyan
 Require-Command node "Install Node.js from https://nodejs.org (LTS version) and make sure it's on PATH."
 Require-Command npm "Installing Node.js also installs npm - reopen PowerShell if npm still isn't found."

 $Frontend = Join-Path $Root "frontend"
 Push-Location $Frontend
 try {
 if (-not (Test-Path ".env")) {
 Copy-Item ".env.example" ".env"
 Write-Host "Created frontend\.env (default points at http://localhost:8000/api)." -ForegroundColor Yellow
 }
 Write-Host "Running npm install (this can take a minute) ..." -ForegroundColor Cyan
 npm install
 if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
 } finally {
 Pop-Location
 }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host " Setup finished - remaining manual steps" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "BACKEND:" -ForegroundColor Yellow
Write-Host " 1. Create an empty MySQL database named 'invoicify' (e.g. in phpMyAdmin)."
Write-Host " 2. Edit '$Root\invoicify-api\.env' using the values in"
Write-Host " '$Root\backend-overlay\.env.example.additions'."
Write-Host " 3. cd invoicify-api"
Write-Host " php artisan migrate --seed"
Write-Host " php artisan test <- run this and check it passes"
Write-Host " php artisan serve <- API now at http://localhost:8000/api"
Write-Host ""
Write-Host "FRONTEND (in a second terminal window):" -ForegroundColor Yellow
Write-Host " cd frontend"
Write-Host " npm run dev <- app now at http://localhost:5173"
Write-Host ""
Write-Host "Sign in with (password 'password123' for all):" -ForegroundColor Yellow
Write-Host " owner@loverealty.com / staff@loverealty.com / juan.delacruz@example.com"
