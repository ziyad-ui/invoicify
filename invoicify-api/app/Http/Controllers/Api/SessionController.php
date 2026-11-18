<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/** "Where you're signed in": the signed-in user's own devices (Sanctum tokens). Every role. */
class SessionController extends Controller
{
    /** GET /api/sessions */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentId = $this->currentTokenId($user);

        $rows = $user->tokens()
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('last_used_at')->orderByDesc('id')
            ->get()
            ->map(fn (PersonalAccessToken $t) => [
                'id' => $t->id,
                'device' => $t->name === 'invoicify' ? 'Unknown device' : $t->name, // older sign-ins have no label
                'lastUsedAt' => ($t->last_used_at ?? $t->created_at)?->toIso8601String(),
                'createdAt' => $t->created_at?->toIso8601String(),
                'current' => $t->id === $currentId,
            ])->values();

        return response()->json(['data' => $rows]);
    }

    /** DELETE /api/sessions/{id} — sign one other device out. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $token = $user->tokens()->whereKey($id)->first();

        abort_if(! $token, 404, 'That device is no longer signed in.');

        if ($token->id === $this->currentTokenId($user)) {
            throw ValidationException::withMessages(['session' => 'This is the device you are using. Use Log out instead.']);
        }

        $token->delete();

        return response()->json(['message' => 'Device signed out.']);
    }

    /** DELETE /api/sessions — sign out every device except this one. */
    public function destroyOthers(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentId = $this->currentTokenId($user);

        $user->tokens()->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))->delete();

        return response()->json(['message' => 'Signed out of all other devices.']);
    }

    private function currentTokenId(User $user): ?int
    {
        $current = $user->currentAccessToken();

        return $current instanceof PersonalAccessToken ? $current->id : null;
    }
}
