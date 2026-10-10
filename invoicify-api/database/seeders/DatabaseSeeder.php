<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Production seeder: creates ONLY the owner login (no demo data).
 *
 * Set OWNER_NAME, OWNER_EMAIL and OWNER_PASSWORD in .env, then run:
 *     php artisan db:seed --force
 * Running it again resets the owner's password (handy if it's forgotten).
 * After the first successful login you can delete OWNER_PASSWORD from .env.
 *
 * For the old demo clients use:  php artisan db:seed --class=DemoSeeder
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $owner = config('invoicify.owner');

        if (blank($owner['email']) || blank($owner['password'])) {
            $this->command?->error('Set OWNER_EMAIL and OWNER_PASSWORD in .env first, then run: php artisan config:clear && php artisan db:seed --force');

            return;
        }

        User::updateOrCreate(
            ['email' => strtolower($owner['email'])],
            [
                'name' => $owner['name'],
                'password' => $owner['password'],
                'role' => User::ROLE_OWNER,
                'is_active' => true,
            ],
        );

        $this->command?->info('Owner login ready: '.strtolower($owner['email']));
    }
}
