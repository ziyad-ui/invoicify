# Deploying Invoicify for a real business

This guide assumes one small cloud server (a "VPS") running Ubuntu 24.04, and two web addresses:

- `https://invoices.yourdomain.com` - the website your staff and clients open (React frontend)
- `https://api.yourdomain.com` - the API behind it (Laravel backend)

Replace `yourdomain.com` everywhere. A 2 GB VPS (about USD 6-12/month at DigitalOcean, Vultr, Hostinger, etc.) is plenty.

## 0. Before you start
1. Buy/own a domain and create two DNS **A records** (`invoices` and `api`) pointing at the server's IP address.
2. Make a Gmail **App Password** (Google account -> Security -> 2-Step Verification -> App passwords) for sending email.
3. Decide the owner's login email and a strong password.

## 1. Install the server software
Log in with SSH, then:

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install nginx mysql-server unzip git curl \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-gd php8.3-bcmath php8.3-intl
curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer
```

Allow longer imports (spreadsheet import can take a minute):

```bash
sudo sed -i 's/^;*max_execution_time.*/max_execution_time = 300/' /etc/php/8.3/fpm/php.ini
sudo sed -i 's/^;*upload_max_filesize.*/upload_max_filesize = 10M/; s/^;*post_max_size.*/post_max_size = 12M/' /etc/php/8.3/fpm/php.ini
sudo systemctl restart php8.3-fpm
```

## 2. Create the database
```bash
sudo mysql
```
```sql
CREATE DATABASE invoicify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'invoicify'@'localhost' IDENTIFIED BY 'a-strong-db-password';
GRANT ALL PRIVILEGES ON invoicify.* TO 'invoicify'@'localhost';
EXIT;
```

## 3. Put the backend on the server
Upload the `invoicify-api` folder (without `vendor`) to `/var/www/invoicify-api` (use `scp`, SFTP, or git), then:

```bash
cd /var/www/invoicify-api
composer install --no-dev --optimize-autoloader
cp .env.production.example .env
nano .env                      # fill in domain, DB password, mail, OWNER_* values
php artisan key:generate
php artisan migrate --force    # creates the tables
php artisan db:seed --force    # creates ONLY the owner login (no demo data)
sudo chown -R www-data:www-data storage bootstrap/cache
php artisan config:cache && php artisan route:cache
```

After you have logged in once, delete the `OWNER_PASSWORD` line from `.env` and run `php artisan config:cache` again.

## 4. Build the website and upload it
On your own computer (needs Node.js):

```bash
cd frontend
# create .env.production containing:  VITE_API_URL=https://api.yourdomain.com/api
npm ci
npm run build
```
Upload everything inside `frontend/dist/` to `/var/www/invoicify-web/` on the server.

## 5. Nginx
`/etc/nginx/sites-available/invoicify`:

```nginx
server {
    server_name api.yourdomain.com;
    root /var/www/invoicify-api/public;
    index index.php;
    client_max_body_size 10M;

    location / { try_files $uri $uri/ /index.php?$query_string; }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_read_timeout 300;
    }
    location ~ /\.(?!well-known).* { deny all; }
}

server {
    server_name invoices.yourdomain.com;
    root /var/www/invoicify-web;
    index index.html;

    location / { try_files $uri /index.html; }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/invoicify /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. HTTPS (required - logins travel over this)
```bash
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d invoices.yourdomain.com
```

## 7. Turn on the daily reminders
The overdue / due-soon emails only go out if the scheduler runs. Add one cron line:

```bash
sudo crontab -u www-data -e
```
```
* * * * * cd /var/www/invoicify-api && php artisan schedule:run >> /dev/null 2>&1
```
It sends reminders every day at 8:00 AM in the app's timezone, which `APP_TIMEZONE=Asia/Manila` in `.env` sets (the default is UTC, which would be 4:00 PM in Manila).

## 8. Email delivery (Gmail vs. a proper sending service)
Reminders, overdue notices and receipts are real emails, so where they are sent from matters.

**Gmail (simplest, fine to start).** A personal Gmail account allows roughly 500 emails a day, and Google can pause sending if it sees bulk-looking mail. Fine for a few dozen clients. Set `INVOICIFY_DAILY_EMAIL_LIMIT=450` so Invoicify stops just before the cap instead of failing at Google.

**A sending service (recommended once you have many clients, or want fewer emails landing in spam).** Invoicify talks to any of them through ordinary SMTP settings in `.env`, with no code changes:

| Service | `MAIL_HOST` | `MAIL_PORT` | Free allowance (check their pricing page) |
|---|---|---|---|
| Brevo | `smtp-relay.brevo.com` | `587` | about 300 emails/day |
| SMTP2GO | `mail.smtp2go.com` | `2525` | small monthly allowance |
| Mailgun | `smtp.mailgun.org` | `587` | trial allowance, then paid |
| Amazon SES | `email-smtp.<your-region>.amazonaws.com` | `587` | very cheap per email; needs a short approval step |

Brevo example:
1. Create a free Brevo account and complete its profile.
2. Add and verify **your own domain** (Brevo shows DNS records to add at your domain provider). This is what keeps your emails out of spam.
3. In Brevo: Settings -> SMTP & API -> SMTP -> generate an SMTP key.
4. In `.env`:
```
MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=<the SMTP login Brevo shows>
MAIL_PASSWORD=<the SMTP key, NOT the API key>
MAIL_FROM_ADDRESS=billing@yourdomain.com
MAIL_FROM_NAME="Love Realty"
INVOICIFY_DAILY_EMAIL_LIMIT=280
```
5. `php artisan config:cache`, then open **Notifications** and press **Resend** on a row for a client whose email is your own.

**The daily limit.** `INVOICIFY_DAILY_EMAIL_LIMIT` is a safety stop set a little under your provider's cap. When it is reached: the 8:00 AM job stops and sends the rest on the next run (nothing is lost), and a manual Resend shows "Daily email limit reached" on the Notifications page. `0` means no limit.

## 9. Backups (do not skip)
```bash
sudo mkdir -p /var/backups/invoicify
sudo crontab -e
```
```
0 2 * * * mysqldump --single-transaction invoicify | gzip > /var/backups/invoicify/db-$(date +\%F).sql.gz && find /var/backups/invoicify -mtime +30 -delete
```
Also copy those files off the server regularly (another machine or cloud storage). Also enable your VPS provider's snapshot backups.

## 10. Open it and sign in
Go to `https://invoices.yourdomain.com`, choose **Owner**, and sign in with `OWNER_EMAIL` / `OWNER_PASSWORD`.
Add clients one by one, or use **Clients -> Import Spreadsheet**.

## Everyday operations
- **Add or remove a staff login:** sign in as Owner and open **Staff** in the sidebar (add, reset password, deactivate). If you are ever locked out, the command line still works: `php artisan invoicify:create-user "Name" email@yourdomain.com --role=staff`
- **A client forgot their password:** open the client, press **Reset Portal Password**, and pass on the one-time temporary password. They will be asked to choose their own at next sign-in.
- **Forgot the owner password:** change `OWNER_PASSWORD` in `.env`, then `php artisan config:cache && php artisan db:seed --force`
- **Send reminders right now:** `php artisan invoicify:send-notifications`
- **Update the app later:** upload the new files, then `composer install --no-dev -o && php artisan migrate --force && php artisan config:cache && php artisan route:cache`; rebuild + re-upload the frontend if it changed.
- **See errors:** `tail -n 100 /var/www/invoicify-api/storage/logs/laravel.log`

## Go-live checklist
- [ ] `APP_DEBUG=false` and `APP_ENV=production`
- [ ] HTTPS works on both addresses
- [ ] Test email: edit a test client to your own email, open Notifications, click Resend
- [ ] Cron line added; backups running and tested by restoring once
- [ ] Owner password is strong and kept out of the `.env` after first login
- [ ] You tested the spreadsheet import with 2-3 rows first

## Good to know
- New staff and clients start with a **temporary password** and are forced to choose their own the first time they sign in. Anyone can change theirs later from **Change password** (bottom of the sidebar, or the top bar in the client portal).
- Resetting a password signs that person out everywhere.
- Sign-ins last 8 hours, then the person signs in again.
