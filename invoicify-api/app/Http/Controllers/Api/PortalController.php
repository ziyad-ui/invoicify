<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientDetailResource;
use App\Models\NotificationLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortalController extends Controller
{
    /**
     * GET /api/portal/me — the signed-in client's own record. There is no
     * client id in the URL on purpose: a client can never ask for someone else's data.
     */
    public function me(Request $request): ClientDetailResource
    {
        $client = $request->user()->client;

        abort_if(! $client, 404, 'No client record is linked to this account.');

        // Note: 'payments.recorder' is deliberately NOT loaded — staff names aren't shown to clients.
        $client->load(['property', 'plan', 'invoices', 'payments.allocations.invoice']);

        return new ClientDetailResource($client);
    }

    /** GET /api/portal/notifications — the reminders and receipts that were emailed to this client (newest first). */
    public function notifications(Request $request): JsonResponse
    {
        $client = $request->user()->client;

        abort_if(! $client, 404, 'No client record is linked to this account.');

        $logs = NotificationLog::where('client_id', $client->id)
            ->where('status', 'Sent')
            ->where('type', '!=', 'Client Welcome')   // that one carries a login, never listed
            ->latest()
            ->limit(20)
            ->get();

        return response()->json(['data' => $logs->map(fn (NotificationLog $l) => [
            'id' => $l->id,
            'type' => $l->type,
            'subject' => $l->subject,
            'sentAt' => $l->created_at->format('Y-m-d h:i A'),
            'status' => $l->status,
        ])->values()]);
    }
}
