<?php

namespace App\Services;

use App\Models\Client;
use App\Models\InstallmentPlan;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Creates a client together with their property, installment plan, invoice
 * schedule and client-portal login. Used by both "Add Client" and the
 * spreadsheet import so the two can never drift apart.
 */
class ClientOnboardingService
{
    public function __construct(private InvoiceScheduleService $schedule)
    {
    }

    /**
     * @param  array  $data  validated: name, email, phone?, property_name, property_type,
     *                       total_price, monthly_amount, term_months, first_due_date,
     *                       latitude?, longitude?, address?, location_notes?
     * @return array{0: Client, 1: string}  the client and their one-time temporary password
     */
    public function create(array $data): array
    {
        $temporaryPassword = Str::password(10, symbols: false);

        $client = DB::transaction(function () use ($data, $temporaryPassword) {
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
                // Optional map pin (all four may be null)
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'address' => $data['address'] ?? null,
                'location_notes' => $data['location_notes'] ?? null,
            ]);

            $plan = InstallmentPlan::create([
                'client_id' => $client->id,
                'property_id' => $property->id,
                'monthly_amount' => $data['monthly_amount'],
                'term_months' => $data['term_months'],
                'first_due_date' => $data['first_due_date'],
            ]);

            $this->schedule->generate($plan);

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

        return [$client, $temporaryPassword];
    }
}
