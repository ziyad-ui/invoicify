<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientDetailResource;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use App\Models\InstallmentPlan;
use App\Models\Property;
use App\Models\User;
use App\Services\InvoiceScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    /** GET /api/clients?q=maria&status=Overdue,Due Soon */
    public function index(Request $request)
    {
        $clients = Client::with(['property', 'plan', 'invoices'])
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

    /** POST /api/clients — creates the client, property, installment plan, invoice schedule and portal login. */
    public function store(Request $request, InvoiceScheduleService $schedule): JsonResponse
    {
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
        ]);

        $temporaryPassword = Str::password(10, symbols: false);

        $client = DB::transaction(function () use ($data, $temporaryPassword, $schedule) {
            $client = Client::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
            ]);

            $property = Property::create([
                'client_id' => $client->id,
                'name' => $data['property_name'],
                'type' => $data['property_type'],
                'total_price' => $data['total_price'],
            ]);

            $plan = InstallmentPlan::create([
                'client_id' => $client->id,
                'property_id' => $property->id,
                'monthly_amount' => $data['monthly_amount'],
                'term_months' => $data['term_months'],
                'first_due_date' => $data['first_due_date'],
            ]);

            $schedule->generate($plan);

            User::create([
                'name' => $client->name,
                'email' => $client->email,
                'password' => $temporaryPassword,
                'role' => User::ROLE_CLIENT,
                'client_id' => $client->id,
                'must_change_password' => true,
            ]);

            return $client;
        });

        $client->load(['property', 'plan', 'invoices', 'payments']);

        // The temporary password is returned exactly once so staff can hand it to the client.
        return (new ClientDetailResource($client))
            ->additional(['temporaryPassword' => $temporaryPassword])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Client $client): ClientDetailResource
    {
        $client->load(['property', 'plan', 'invoices', 'payments.allocations.invoice', 'payments.recorder']);

        return new ClientDetailResource($client);
    }

    public function update(Request $request, Client $client): ClientDetailResource
    {
        $user = $client->user;

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
        ]);

        DB::transaction(function () use ($data, $client, $user) {
            $client->update(collect($data)->only(['name', 'email', 'phone'])->all());

            if ($user) {
                $user->update(collect($data)->only(['name', 'email'])->all());
            }

            $propertyFields = array_filter([
                'name' => $data['property_name'] ?? null,
                'type' => $data['property_type'] ?? null,
                'total_price' => $data['total_price'] ?? null,
            ], fn ($v) => $v !== null);

            if ($propertyFields && $client->property) {
                $client->property->update($propertyFields);
            }
        });

        return $this->show($client->refresh());
    }

    /** "Archive": keeps all history but hides the client and disables their portal login. */
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
}
