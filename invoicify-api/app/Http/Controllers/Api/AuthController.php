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
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'role' => ['required', 'in:owner,staff,client'],
        ]);

        $user = User::where('email', $data['email'])->first();

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

        // The login screen has Owner / Staff / Client tabs; the account must match the chosen tab.
        if ($user->role !== $data['role']) {
            throw ValidationException::withMessages([
                'role' => 'This account is not registered as '.strtolower($this->roleLabel($data['role'])).'. Choose the correct account type.',
            ]);
        }

        $token = $user->createToken('invoicify', ['*'], now()->addHours(8))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->payload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->payload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role,
            'title' => $user->title(),
            'email' => $user->email,
            'clientId' => $user->client_id,
            'mustChangePassword' => (bool) $user->must_change_password,
        ];
    }

    private function roleLabel(string $role): string
    {
        return ['owner' => 'Owner', 'staff' => 'Administrative Staff', 'client' => 'Client'][$role];
    }
}
