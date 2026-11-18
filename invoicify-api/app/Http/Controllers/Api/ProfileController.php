<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\PersonalAccessToken;

/** Self-service account edits for every role (owner, staff and client). */
class ProfileController extends Controller
{
    /** POST /api/user/update-profile — change your display name. */
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($user, $data) {
            $user->update(['name' => trim($data['name'])]);
            $user->client?->update(['name' => trim($data['name'])]); // keep the client record in step
        });

        return response()->json(['message' => 'Profile updated.', 'user' => $user->fresh()->sessionPayload()]);
    }

    /**
     * POST /api/user/avatar — profile picture. The browser crops it to a 256px square JPEG and sends it as a
     * data URL, so it is stored in the database and no file storage has to be set up.
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'avatar' => ['required', 'string', 'max:250000', function (string $attribute, mixed $value, \Closure $fail) {
                if (! preg_match('#^data:image/(jpeg|png|webp);base64,#', $value, $m)) {
                    return $fail('Choose a JPG, PNG or WebP image.');
                }

                $binary = base64_decode(substr($value, strlen($m[0])), true);

                if ($binary === false || strlen($binary) > 180000) {
                    return $fail('That image is too large. Try a smaller one.');
                }

                $info = @getimagesizefromstring($binary);

                if (! $info || $info[0] > 1024 || $info[1] > 1024) {
                    return $fail('That file is not a valid image.');
                }
            }],
        ]);

        $user = $request->user();
        $user->update(['avatar' => $data['avatar']]);

        return response()->json(['message' => 'Profile photo updated.', 'user' => $user->fresh()->sessionPayload()]);
    }

    /** DELETE /api/user/avatar */
    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->update(['avatar' => null]);

        return response()->json(['message' => 'Profile photo removed.', 'user' => $user->fresh()->sessionPayload()]);
    }

    /** POST /api/user/update-email — needs the current password. Clients' client record is kept in sync. */
    public function updateEmail(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'email' => [
                'required', 'email', 'max:190',
                Rule::unique('users', 'email')->ignore($user->id),
                Rule::unique('clients', 'email')->ignore($user->client_id),
            ],
            'current_password' => ['required', 'current_password:sanctum'],
        ]);

        DB::transaction(function () use ($user, $data) {
            $user->update(['email' => $data['email']]);
            $user->client?->update(['email' => $data['email']]);
        });

        return response()->json(['message' => 'Email updated.', 'user' => $user->fresh()->sessionPayload()]);
    }

    /** PUT /api/password and POST /api/user/change-password — change your own password. */
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

        return response()->json(['message' => 'Password updated.', 'user' => $user->fresh()->sessionPayload()]);
    }
}
