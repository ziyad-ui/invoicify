<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\TemporaryPasswordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Owner-only management of Administrative Staff logins.
 * The owner account itself is listed but can never be edited or deactivated here.
 */
class StaffController extends Controller
{
    /** GET /api/staff */
    public function index(): JsonResponse
    {
        $users = User::whereIn('role', [User::ROLE_OWNER, User::ROLE_STAFF])
            ->orderBy('role')   // 'owner' sorts before 'staff'
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $users->map(fn (User $u) => $this->payload($u))->values()]);
    }

    /** POST /api/staff — creates a staff login with a one-time temporary password. */
    public function store(Request $request, TemporaryPasswordService $passwords): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email'), Rule::unique('clients', 'email')],
        ]);

        $staff = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => bin2hex(random_bytes(16)), // replaced just below
            'role' => User::ROLE_STAFF,
            'is_active' => true,
        ]);

        $temporaryPassword = $passwords->reset($staff);

        return response()->json([
            'data' => $this->payload($staff->fresh()),
            'temporaryPassword' => $temporaryPassword,
        ], 201);
    }

    /** PATCH /api/staff/{staff} — rename, change email, activate / deactivate. */
    public function update(Request $request, User $staff): JsonResponse
    {
        $this->ensureStaff($staff);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => [
                'sometimes', 'required', 'email', 'max:190',
                Rule::unique('users', 'email')->ignore($staff->id),
                Rule::unique('clients', 'email'),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['email'])) {
            $data['email'] = strtolower($data['email']);
        }

        $staff->update($data);

        if (array_key_exists('is_active', $data) && ! $data['is_active']) {
            $staff->tokens()->delete(); // signed out immediately
        }

        return response()->json(['data' => $this->payload($staff->fresh())]);
    }

    /** POST /api/staff/{staff}/reset-password — new temporary password; emailed to the staff member and shown to the owner once. */
    public function resetPassword(User $staff, TemporaryPasswordService $passwords, NotificationService $notifications): JsonResponse
    {
        $this->ensureStaff($staff);

        $temporaryPassword = $passwords->reset($staff);

        return response()->json([
            'data' => $this->payload($staff->fresh()),
            'temporaryPassword' => $temporaryPassword,
            'emailed' => $notifications->sendStaffCredentials($staff, $temporaryPassword),
        ]);
    }

    /**
     * DELETE /api/staff/{staff} — permanently removes a staff login. Payments they recorded keep their history
     * (the "recorded by" link is simply cleared). The owner account can never be deleted here.
     */
    public function destroy(User $staff): Response
    {
        $this->ensureStaff($staff);

        DB::transaction(function () use ($staff) {
            $staff->tokens()->delete();
            $staff->delete();
        });

        return response()->noContent();
    }

    private function ensureStaff(User $user): void
    {
        abort_unless($user->role === User::ROLE_STAFF, 404, 'Staff member not found.');
    }

    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'title' => $user->title(),
            'isActive' => (bool) $user->is_active,
            'createdAt' => $user->created_at?->toIso8601String(),
        ];
    }
}
