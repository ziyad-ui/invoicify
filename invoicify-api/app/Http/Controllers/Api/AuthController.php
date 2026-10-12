<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
