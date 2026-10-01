<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientDetailResource;
use App\Http\Resources\PaymentResource;
use App\Models\Client;
use App\Models\Payment;
use App\Services\NotificationService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    /** GET /api/payments — full transaction history. */
    public function index(Request $request)
    {
        $payments = Payment::with(['client', 'allocations.invoice', 'recorder'])
            ->when($request->query('client_id'), fn ($q, $id) => $q->where('client_id', $id))
            ->orderByDesc('paid_at')
            ->orderByDesc('id')
            ->limit(1000)
            ->get();

        return PaymentResource::collection($payments);
    }

    /**
     * POST /api/clients/{client}/payments
     * Records a payment that was already made externally. Invoicify never moves money.
     */
    public function store(Request $request, Client $client, PaymentService $payments, NotificationService $notifications): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'mode' => ['required', Rule::in(Payment::MODES)],
            'reference' => ['nullable', 'string', 'max:80', 'required_unless:mode,Cash', Rule::unique('payments', 'reference')],
            'paid_at' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $payment = $payments->record(
            $client,
            (float) $data['amount'],
            $data['mode'],
            $data['reference'] ?? null,
            $data['paid_at'] ?? today()->toDateString(),
            $request->user(),
        );

        // Email the receipt. If mail fails it's logged as Failed; the payment stays recorded.
        $notifications->sendPaymentReceipt($payment);

        $client->refresh()->load(['property', 'plan', 'invoices', 'payments.allocations.invoice', 'payments.recorder']);
        $payment->load(['client', 'allocations.invoice', 'recorder']);

        return (new ClientDetailResource($client))
            ->additional(['payment' => (new PaymentResource($payment))->resolve($request)])
            ->response()
            ->setStatusCode(201);
    }
}
