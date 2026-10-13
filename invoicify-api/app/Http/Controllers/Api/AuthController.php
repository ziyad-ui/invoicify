<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * GET /api/auth/check-role?email=... — powers the login screen's "Signing in as ..." hint.
     * Only returns a role for an active account; it is a convenience, never an authorization step
     * (login below decides the role from the database). Throttled to slow down email probing.
     */
    public function checkRole(Request $request): JsonResponse
    {
        $email = trim((string) $request->query('email', ''));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['role' => null]);
        }

        $user = $this->findByEmail($email);

        if (! $user || ! $user->is_active) {
            return response()->json(['role' => null]);
        }

        return response()->json(['role' => $user->role, 'label' => $user->title()]);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            // Optional and untrusted: the account's real role always comes from the database.
            'role' => ['sometimes', 'nullable', 'in:owner,staff,client'],
        ]);

        $user = $this->findByEmail($data['email']);

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'This account has been deactivated. Please contact Love Realty.',
            ]);
        }

        // Older clients may still send a role; if they do, it has to match the account.
        if (! empty($data['role']) && $user->role !== $data['role']) {
            throw ValidationException::withMessages([
                'role' => 'This account is not registered as '.strtolower($this->roleLabel($data['role'])).'.',
            ]);
        }

        $token = $user->createToken('invoicify', ['*'], now()->addHours(8))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->sessionPayload(),
        ]);
    }

    /**
     * POST /api/forgot-password — emails a one-time reset link to the account.
     * The answer is always the same whether or not the email exists, so this can't be used
     * to find out who has an account.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);

        $user = $this->findByEmail($data['email']);

        if ($user && $user->is_active) {
            $broker = PasswordBroker::broker();

            // One email per minute per account: a second request inside that window is ignored quietly.
            if (! $broker->getRepository()->recentlyCreatedToken($user)) {
                $token = $broker->createToken($user);
                $origin = rtrim(trim(explode(',', (string) config('invoicify.frontend_url'))[0]), '/');
                $url = $origin.'/reset-password?token='.$token.'&email='.urlencode($user->email);

                try {
                    Mail::to($user->email)->send(new PasswordResetMail(
                        $user->name,
                        $url,
                        (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60),
                    ));
                } catch (\Throwable $e) {
                    report($e); // mail misconfigured: keep the response generic, the error is in the log
                }
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link is on its way.',
        ]);
    }

    /** POST /api/reset-password — sets a new password from the emailed link. */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $invalid = ValidationException::withMessages([
            'email' => 'This reset link is invalid or has expired. Please request a new one.',
        ]);

        $user = $this->findByEmail($data['email']);
        if (! $user || ! $user->is_active) {
            throw $invalid;
        }

        $status = PasswordBroker::reset(
            ['email' => $user->email, 'token' => $data['token'], 'password' => $data['password']],
            function (User $user, string $password) {
                $user->forceFill(['password' => $password, 'must_change_password' => false])->save();
                $user->tokens()->delete(); // sign out every device that was using the old password
            }
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            throw $invalid;
        }

        return response()->json(['message' => 'Your password has been reset. You can now sign in.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->sessionPayload()]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    private function findByEmail(string $email): ?User
    {
        return User::whereRaw('LOWER(email) = ?', [strtolower(trim($email))])->first();
    }

    private function roleLabel(string $role): string
    {
        return ['owner' => 'Owner', 'staff' => 'Administrative Staff', 'client' => 'Client'][$role];
    }
}
