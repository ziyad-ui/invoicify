<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Owner-editable settings for the client portal: the dashboard announcement banner and the
 * "how to pay" instructions. Clients read the effective values through PortalController::settings().
 */
class SettingsController extends Controller
{
    public const DEFAULT_PAYMENT_INSTRUCTIONS = 'To settle your balance, pay via bank transfer, check, or in person at the Love Realty office, then send your receipt to your account officer for recording. Payments are confirmed here once verified by staff.';

    private const ANNOUNCEMENT_KEY = 'portal.announcement';

    private const INSTRUCTIONS_KEY = 'portal.payment_instructions';

    /** GET /api/settings/portal (owner) */
    public function portal(): JsonResponse
    {
        return response()->json(['data' => self::portalSettings()]);
    }

    /** PUT /api/settings/portal (owner) — each section can be saved on its own. */
    public function updatePortal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'announcement' => ['sometimes', 'array'],
            'announcement.enabled' => ['required_with:announcement', 'boolean'],
            'announcement.message' => ['nullable', 'string', 'max:300'],
            'announcement.tone' => ['required_with:announcement', 'in:info,warning'],
            'announcement.expires_on' => ['nullable', 'date', 'after_or_equal:today'],
            'payment_instructions' => ['sometimes', 'nullable', 'string', 'max:1500'],
        ]);

        if (isset($data['announcement'])) {
            $a = $data['announcement'];
            $message = trim((string) ($a['message'] ?? ''));

            if (! empty($a['enabled']) && $message === '') {
                throw ValidationException::withMessages(['announcement.message' => 'Write the announcement before turning it on.']);
            }

            AppSetting::write(self::ANNOUNCEMENT_KEY, [
                'enabled' => (bool) $a['enabled'],
                'message' => $message,
                'tone' => $a['tone'],
                'expiresOn' => $a['expires_on'] ?? null,
            ]);
        }

        if (array_key_exists('payment_instructions', $data)) {
            $text = trim((string) $data['payment_instructions']);
            $text === '' ? AppSetting::forget(self::INSTRUCTIONS_KEY) : AppSetting::write(self::INSTRUCTIONS_KEY, $text);
        }

        return response()->json(['message' => 'Settings saved.', 'data' => self::portalSettings()]);
    }

    /** Everything the owner can edit, with defaults filled in. */
    public static function portalSettings(): array
    {
        return [
            'announcement' => array_merge(
                ['enabled' => false, 'message' => '', 'tone' => 'info', 'expiresOn' => null],
                (array) AppSetting::read(self::ANNOUNCEMENT_KEY, [])
            ),
            'paymentInstructions' => (string) AppSetting::read(self::INSTRUCTIONS_KEY, self::DEFAULT_PAYMENT_INSTRUCTIONS),
        ];
    }

    /** What a client should see right now: the banner only while it is switched on and not expired. */
    public static function forClients(): array
    {
        $s = self::portalSettings();
        $a = $s['announcement'];

        $live = $a['enabled']
            && $a['message'] !== ''
            && (! $a['expiresOn'] || today()->lte(\Illuminate\Support\Carbon::parse($a['expiresOn'])));

        return [
            'announcement' => $live ? ['message' => $a['message'], 'tone' => $a['tone']] : null,
            'paymentInstructions' => $s['paymentInstructions'],
        ];
    }
}
