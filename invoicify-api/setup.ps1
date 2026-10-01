<#
  Invoicify backend setup — run this once from inside this
  "invoicify-backend-overlay" folder.

  What it does:
    1. Creates a fresh Laravel 12 project (or reuses one that's already there)
    2. Installs laravel/sanctum and maatwebsite/excel (version-pinned to avoid
       the PHP 8.3 / caret-stripping problems hit earlier)
    3. Copies this folder's app/, config/, database/, routes/, etc. on top of it
    4. Tells you the 3 manual steps left (.env, migrate --seed, serve)

  Usage (from PowerShell, inside this folder):
      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
      .\setup.ps1
  Or, to install somewhere other than the default sibling "invoicify-api" folder:
      .\setup.ps1 -Target "C:\path\to\invoicify-api"
#>

param(
  [string]$Target = (Join-Path (Split-Path $PSScriptRoot -Parent) "invoicify-api")
)

$ErrorActionPreference = "Stop"
$Overlay = $PSScriptRoot

function Require-Command($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: '$name' was not found on PATH. $hint" -ForegroundColor Red
    exit 1
  }
}

Write-Host "== Invoicify backend setup ==" -ForegroundColor Cyan
Require-Command php "Install PHP (e.g. via XAMPP) and make sure it's on PATH."
Require-Command composer "Install Composer from https://getcomposer.org and make sure it's on PATH."

if (Test-Path $Target) {
  if (Test-Path (Join-Path $Target "artisan")) {
    Write-Host "Found an existing Laravel project at:`n  $Target`nWill install packages into it and copy Invoicify's files on top." -ForegroundColor Yellow
  } else {
    Write-Host "ERROR: '$Target' already exists and isn't a Laravel project (no 'artisan' file)." -ForegroundColor Red
    Write-Host "Remove or rename that folder, or run: .\setup.ps1 -Target `"C:\some\other\path`"" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "Creating a fresh Laravel 12 project at:`n  $Target" -ForegroundColor Cyan
  composer create-project laravel/laravel:^12.0 $Target
  if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: composer create-project failed." -ForegroundColor Red; exit 1 }
}

Push-Location $Target
try {
  Write-Host "`nInstalling laravel/sanctum ..." -ForegroundColor Cyan
  composer require laravel/sanctum
  if ($LASTEXITCODE -ne 0) { throw "composer require laravel/sanctum failed." }

  Write-Host "`nInstalling maatwebsite/excel (pinned to 3.1.70 for PHP 8.2 compatibility) ..." -ForegroundColor Cyan
  composer require maatwebsite/excel:3.1.70
  if ($LASTEXITCODE -ne 0) { throw "composer require maatwebsite/excel failed." }

  Write-Host "`nPublishing Sanctum's config + migration ..." -ForegroundColor Cyan
  php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

  Write-Host "`nCopying Invoicify's backend files on top of the project ..." -ForegroundColor Cyan
  # robocopy (not Copy-Item) so existing folders like config/ and app/ are
  # MERGED rather than nested inside themselves.
  robocopy $Overlay $Target /E /XF "setup.ps1" "README.md" ".env.example.additions" /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed while copying overlay files (exit code $LASTEXITCODE)." }

  Write-Host "`n== Install complete ==" -ForegroundColor Green
  Write-Host "Three manual steps left:" -ForegroundColor Green
  Write-Host "  1. Create an empty MySQL database named 'invoicify' (e.g. in phpMyAdmin)."
  Write-Host "  2. Edit '$Target\.env' using the values in '$Overlay\.env.example.additions'"
  Write-Host "     (at least DB_DATABASE, DB_USERNAME, DB_PASSWORD, FRONTEND_URL)."
  Write-Host "  3. Then run:"
  Write-Host "       cd `"$Target`""
  Write-Host "       php artisan migrate --seed"
  Write-Host "       php artisan test"
  Write-Host "       php artisan serve"
}
finally {
  Pop-Location
}
