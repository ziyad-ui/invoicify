<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class CreateUser extends Command
{
    protected $signature = 'invoicify:create-user {name : Full name} {email} {--role=staff : owner or staff}';

    protected $description = 'Create an owner/staff login, or reset the password of an existing one';

    public function handle(): int
    {
        $role = $this->option('role');
        if (! in_array($role, [User::ROLE_OWNER, User::ROLE_STAFF], true)) {
            $this->error('--role must be "owner" or "staff".');

            return self::FAILURE;
        }

        $email = strtolower(trim($this->argument('email')));
        $existing = User::where('email', $email)->first();
        if ($existing && $existing->role === User::ROLE_CLIENT) {
            $this->error('That email belongs to a client portal login.');

            return self::FAILURE;
        }

        $password = (string) $this->secret('Password (at least 8 characters, with letters and numbers)');
        if (strlen($password) < 8 || ! preg_match('/[A-Za-z]/', $password) || ! preg_match('/\d/', $password)) {
            $this->error('Password must be at least 8 characters and contain letters and numbers.');

            return self::FAILURE;
        }

        User::updateOrCreate(
            ['email' => $email],
            ['name' => $this->argument('name'), 'password' => $password, 'role' => $role, 'is_active' => true],
        );

        $this->info(($existing ? 'Updated' : 'Created')." {$role} login for {$email}.");

        return self::SUCCESS;
    }
}
