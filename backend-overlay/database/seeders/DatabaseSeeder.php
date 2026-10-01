<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\InstallmentPlan;
use App\Models\Property;
use App\Models\User;
use App\Services\InvoiceScheduleService;
use App\Services\PaymentService;
use Illuminate\Database\Seeder;

/**
 * Demo data mirroring the prototype (Maria, Juan, Ana, Carlos, Liza + Rico).
 * Dates are relative to "today" so the demo always shows realistic
 * Overdue / Due Soon / Current / Fully Paid statuses.
 *
 * Demo password for every account: password123  — CHANGE OR DELETE before real use.
 */
class DatabaseSeeder extends Seeder
{
    public function run(InvoiceScheduleService $schedule, PaymentService $payments): void
    {
        $owner = User::create([
            'name' => 'Marivic D. Juan', 'email' => 'owner@loverealty.com',
            'password' => 'password123', 'role' => User::ROLE_OWNER,
        ]);
        $staff = User::create([
            'name' => 'Marites Juan', 'email' => 'staff@loverealty.com',
            'password' => 'password123', 'role' => User::ROLE_STAFF,
        ]);

        // remaining = installments still unpaid; nextDueOffset = days from today until the next unpaid due date.
        $demo = [
            ['Maria Santos', 'maria.santos@example.com', '0917 555 0142', 'Unit 12B, Sunview Residences', 'Residential Condominium', 1850000, 8500, 12, 1, -12],
            ['Juan Dela Cruz', 'juan.delacruz@example.com', '0918 555 0987', 'Lot 4, Greenfield Homes', 'Open Lot', 950000, 12000, 12, 1, -11],
            ['Ana Reyes', 'ana.reyes@example.com', '0919 555 0231', 'Unit 5A, Palm Court Condo', 'Residential Condominium', 2100000, 9500, 24, 2, 3],
            ['Carlos Mendoza', 'carlos.mendoza@example.com', '0920 555 0456', 'Lot 9, Riverside Estates', 'Open Lot', 1200000, 15000, 12, 3, 20],
            ['Liza Fernandez', 'liza.fernandez@example.com', '0921 555 0678', 'Unit 3C, Metro Heights', 'Residential Condominium', 1650000, 13750, 12, 0, -40],
            ['Rico Villanueva', 'rico.villanueva@example.com', '0922 555 0812', 'Lot 2, Seabreeze Beach Lots', 'Beach Property', 2600000, 21500, 24, 2, 5],
        ];

        $modes = ['Bank Transfer', 'Cash', 'Check'];
        $refCounter = 1000;

        foreach ($demo as [$name, $email, $phone, $propName, $propType, $price, $monthly, $term, $remaining, $offset]) {
            $paidCount = $term - $remaining;
            $nextDue = today()->addDays($offset);

            $client = Client::create(['name' => $name, 'email' => $email, 'phone' => $phone]);
            $property = Property::create([
                'client_id' => $client->id, 'name' => $propName, 'type' => $propType, 'total_price' => $price,
            ]);
            $plan = InstallmentPlan::create([
                'client_id' => $client->id,
                'property_id' => $property->id,
                'monthly_amount' => $monthly,
                'term_months' => $term,
                'first_due_date' => $nextDue->copy()->subMonthsNoOverflow($paidCount),
            ]);
            $schedule->generate($plan);

            User::create([
                'name' => $name, 'email' => $email, 'password' => 'password123',
                'role' => User::ROLE_CLIENT, 'client_id' => $client->id,
            ]);

            // Back-fill payment history for every installment that's already paid.
            for ($i = 0; $i < $paidCount; $i++) {
                $due = $plan->first_due_date->copy()->addMonthsNoOverflow($i);
                $mode = $modes[$i % 3];
                $reference = match ($mode) {
                    'Bank Transfer' => 'BANK-'.(++$refCounter),
                    'Check' => 'CHK-'.(++$refCounter),
                    default => null,
                };

                $payments->record($client, (float) $monthly, $mode, $reference, $due->copy()->subDays(2)->toDateString(), $staff);
            }
        }
    }
}
