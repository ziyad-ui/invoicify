<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\PersonalAccessToken;

class ProfileController extends Controller
{
    /** PUT /api/password — any signed-in user changes their own password. */
    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:sanctum'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        $user = $request->user();
        $user->update([
            'password' => $data['password'],
            'must_change_password' => false,
        ]);

        // Sign out every OTHER device/session; keep the one being used right now.
        $current = $user->currentAccessToken();
        $keepId = $current instanceof PersonalAccessToken ? $current->id : null;
        $user->tokens()->when($keepId, fn ($q) => $q->where('id', '!=', $keepId))->delete();

        return response()->json(['message' => 'Password updated.']);
    }
}
