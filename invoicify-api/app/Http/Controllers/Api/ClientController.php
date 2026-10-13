<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientDetailResource;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use App\Models\User;
use App\Services\ClientOnboardingService;
use App\Services\InvoiceScheduleService;
use App\Services\NotificationService;
use App\Services\TemporaryPasswordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    /**
     * GET /api/clients?q=maria&status=Overdue,Due Soon&archived=1
     * `archived=1` lists archived (soft-deleted) clients instead of active ones.
     */
    public function index(Request $request)
    {
        $query = Client::with(['property', 'plan', 'invoices']);

        if ($request->boolean('archived')) {
            $query->onlyTrashed();
        }

        $clients = $query
            ->when($request->query('q'), function ($query, $q) {
                $query->where(function ($w) use ($q) {
                    $w->where('name', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%")
                        ->orWhereHas('property', fn ($p) => $p->where('name', 'like', "%{$q}%"));
                });
            })
            ->orderBy('name')
            ->get();

        // Status is derived from invoice dates, so filter after loading.
        if ($statuses = $request->query('status')) {
            $wanted = array_map('trim', explode(',', $statuses));
            $clients = $clients->whereIn('status', $wanted)->values();
        }

        return ClientResource::collection($clients);
    }

    /**
     * POST /api/clients — creates the client, property, installment plan, invoice schedule and portal login,
     * then emails the client their sign-in details. If the email can't be sent, the temporary password is
     * returned once so staff can hand it over; otherwise it is never exposed.
     */
    public function store(Request $request, ClientOnboardingService $onboarding, NotificationService $notifications): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', Rule::unique('clients', 'email'), Rule::unique('users', 'email')],
            'phone' => ['nullable', 'string', 'max:30'],
            'property_name' => ['required', 'string', 'max:160'],
            'property_type' => ['required', 'string', 'max:80'],
            'total_price' => ['required', 'numeric', 'min:0'],
            'monthly_amount' => ['required', 'numeric', 'min:1'],
            'term_months' => ['required', 'integer', 'min:1', 'max:120'],
            'first_due_date' => ['required', 'date'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'address' => ['nullable', 'string', 'max:255'],
            'location_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        [$client, $temporaryPassword] = $onboarding->create($data);

        $client->load(['property', 'plan', 'invoices', 'payments']);

        $welcome = $notifications->sendClientWelcome($client, $temporaryPassword);
        $sent = $welcome->status === 'Sent';

        return (new ClientDetailResource($client))
            ->additional([
                'welcomeEmail' => ['sent' => $sent, 'error' => $sent ? null : $welcome->error],
                'temporaryPassword' => $sent ? null : $temporaryPassword,
            ])
            ->response()
            ->setStatusCode(201);
    }

    /** POST /api/clients/{client}/reset-password — new one-time temporary password for the client's portal login. */
    public function resetPassword(Client $client, TemporaryPasswordService $passwords): JsonResponse
    {
        $user = User::where('client_id', $client->id)->where('role', User::ROLE_CLIENT)->first();
        abort_unless($user, 404, 'This client has no portal login.');

        return response()->json([
            'email' => $user->email,
            'temporaryPassword' => $passwords->reset($user),
        ]);
    }

    public function show(Client $client): ClientDetailResource
    {
        $client->load(['property', 'plan', 'invoices', 'payments.allocations.invoice', 'payments.recorder']);

        return new ClientDetailResource($client);
    }

    public function update(Request $request, Client $client, InvoiceScheduleService $schedule): ClientDetailResource
    {
        $user = $client->user;

        if ($request->has('email')) {
            $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => [
                'sometimes', 'required', 'email', 'max:190',
                Rule::unique('clients', 'email')->ignore($client->id),
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'property_name' => ['sometimes', 'required', 'string', 'max:160'],
            'property_type' => ['sometimes', 'required', 'string', 'max:80'],
            'total_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'monthly_amount' => ['sometimes', 'required', 'numeric', 'min:1'],
            'term_months' => ['sometimes', 'required', 'integer', 'min:1', 'max:120'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'address' => ['nullable', 'string', 'max:255'],
            'location_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($data, $client, $user, $schedule) {
            $client->update(collect($data)->only(['name', 'email', 'phone'])->all());

            if ($user) {
                $user->update(collect($data)->only(['name', 'email'])->all());
            }

            $propertyFields = array_filter([
                'name' => $data['property_name'] ?? null,
                'type' => $data['property_type'] ?? null,
                'total_price' => $data['total_price'] ?? null,
            ], fn ($v) => $v !== null);

            // Map pin: unlike the fields above, null is meaningful here (it clears the pin / notes).
            foreach (['latitude', 'longitude', 'address', 'location_notes'] as $field) {
                if (array_key_exists($field, $data)) {
                    $propertyFields[$field] = $data[$field];
                }
            }

            if ($propertyFields && $client->property) {
                $client->property->update($propertyFields);
            }

            // Monthly amount / term live on the installment plan; rebuild the unpaid part of the schedule if they changed.
            if ($plan = $client->plan) {
                $monthly = (float) ($data['monthly_amount'] ?? $plan->monthly_amount);
                $term = (int) ($data['term_months'] ?? $plan->term_months);

                if (abs($monthly - (float) $plan->monthly_amount) > 0.004 || $term !== (int) $plan->term_months) {
                    $schedule->reschedule($plan, round($monthly, 2), $term);
                }
            }
        });

        return $this->show($client->refresh());
    }

    /** "Archive": keeps all history but hides the client and disables their portal login. Reversible via restore(). */
    public function destroy(Client $client): Response
    {
        $client->load('invoices');

        if ($client->balance > 0) {
            abort(422, "Clients with an outstanding balance can't be archived.");
        }

        DB::transaction(function () use ($client) {
            if ($user = $client->user) {
                $user->tokens()->delete();
                $user->update(['is_active' => false]);
            }
            $client->delete();
        });

        return response()->noContent();
    }

    /** POST /api/clients/{id}/restore — bring an archived client (and their portal login) back. */
    public function restore(int $id): ClientResource
    {
        $client = Client::onlyTrashed()->findOrFail($id);

        DB::transaction(function () use ($client) {
            $client->restore();
            $client->user?->update(['is_active' => true]);
        });

        return new ClientResource($client->fresh(['property', 'plan', 'invoices']));
    }

    /** DELETE /api/clients/{id}/permanent — owner only; only works on archived clients and erases their invoices and payments. */
    public function forceDelete(int $id): Response
    {
        $client = Client::onlyTrashed()->findOrFail($id);

        DB::transaction(function () use ($client) {
            User::where('client_id', $client->id)->get()->each(function (User $user) {
                $user->tokens()->delete();
                $user->delete();
            });

            $client->forceDelete(); // property, plan, invoices, payments and notification logs cascade
        });

        return response()->noContent();
    }
}
