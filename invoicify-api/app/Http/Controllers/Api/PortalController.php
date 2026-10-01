<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientDetailResource;
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
}
