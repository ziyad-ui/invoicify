<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * Issues a one-time temporary password (used for new staff and for "reset password"),
 * forces a change at next sign-in, and signs the person out everywhere.
 */
class TemporaryPasswordService
{
    public function reset(User $user): string
    {
        $password = Str::password(10, symbols: false);

        $user->update(['password' => $password, 'must_change_password' => true]);
        $user->tokens()->delete();

        return $password;
    }
}
