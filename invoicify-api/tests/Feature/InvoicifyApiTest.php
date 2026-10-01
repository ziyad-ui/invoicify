<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\InstallmentPlan;
use App\Models\Property;
use App\Models\User;
use App\Services\InvoiceScheduleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvoicifyApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role, ?Client $client = null): User
    {
        return User::create([
            'name' => ucfirst($role).' User',
            'email' => "{$role}".uniqid().'@example.com',
            'password' => 'password123',
            'role' => $role,
            'client_id' => $client?->id,
        ]);
    }

    /** 3 installments of 1,000; the first was due 10 days ago (so the client starts Overdue). */
    private function makeClient(): Client
    {
        $client = Client::create(['name' => 'Test Client', 'email' => uniqid().'@example.com']);
        $property = Property::create(['client_id' => $client->id, 'name' => 'Lot 1', 'type' => 'Open Lot', 'total_price' => 3000]);
        $plan = InstallmentPlan::create([
            'client_id' => $client->id, 'property_id' => $property->id,
            'monthly_amount' => 1000, 'term_months' => 3, 'first_due_date' => today()->subDays(10),
        ]);
        app(InvoiceScheduleService::class)->generate($plan);

        return $client;
    }

    public function test_login_rejects_wrong_role_tab(): void
    {
        $user = $this->makeUser('staff');

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123', 'role' => 'owner'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123', 'role' => 'staff'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'role', 'title', 'email']]);
    }

    public function test_role_boundaries_are_enforced_on_the_server(): void
    {
        $client = $this->makeClient();

        Sanctum::actingAs($this->makeUser('client', $client));
        $this->getJson('/api/clients')->assertForbidden();
        $this->getJson('/api/portal/me')->assertOk()->assertJsonPath('data.name', 'Test Client');

        Sanctum::actingAs($this->makeUser('staff'));
        $this->getJson('/api/clients')->assertOk();
        $this->getJson('/api/reports/summary')->assertForbidden();
        $this->getJson('/api/portal/me')->assertForbidden();

        Sanctum::actingAs($this->makeUser('owner'));
        $this->getJson('/api/reports/summary')->assertOk();
    }

    public function test_payments_apply_oldest_invoice_first_and_update_status(): void
    {
        $client = $this->makeClient();
        Sanctum::actingAs($this->makeUser('staff'));

        $this->getJson("/api/clients/{$client->id}")->assertJsonPath('data.status', 'Overdue');

        // 1,500 clears invoice #1 and puts 500 on invoice #2.
        $res = $this->postJson("/api/clients/{$client->id}/payments", ['amount' => 1500, 'mode' => 'Cash'])
            ->assertCreated()
            ->assertJsonPath('payment.type', 'Full Payment');
        $this->assertEquals(1500, $res->json('data.balance'));

        // Reference number is mandatory for non-cash payments.
        $this->postJson("/api/clients/{$client->id}/payments", ['amount' => 100, 'mode' => 'Bank Transfer'])
            ->assertStatus(422)->assertJsonValidationErrors('reference');

        // Can't record more than what's owed.
        $this->postJson("/api/clients/{$client->id}/payments", ['amount' => 1600, 'mode' => 'Cash'])
            ->assertStatus(422)->assertJsonValidationErrors('amount');

        $res = $this->postJson("/api/clients/{$client->id}/payments", ['amount' => 1500, 'mode' => 'Check', 'reference' => 'CHK-1'])
            ->assertCreated()
            ->assertJsonPath('payment.type', 'Final Payment')
            ->assertJsonPath('data.status', 'Fully Paid');
        $this->assertEquals(0, $res->json('data.balance'));
    }

    public function test_client_with_balance_cannot_be_archived(): void
    {
        $client = $this->makeClient();
        Sanctum::actingAs($this->makeUser('owner'));

        $this->deleteJson("/api/clients/{$client->id}")->assertStatus(422);
    }

    public function test_user_can_change_password_and_temporary_flag_clears(): void
    {
        $user = $this->makeUser('client', $this->makeClient());
        $user->update(['must_change_password' => true]);
        Sanctum::actingAs($user);

        // wrong current password
        $this->putJson('/api/password', [
            'current_password' => 'nope', 'password' => 'NewPass123', 'password_confirmation' => 'NewPass123',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');

        // weak new password
        $this->putJson('/api/password', [
            'current_password' => 'password123', 'password' => 'short', 'password_confirmation' => 'short',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->putJson('/api/password', [
            'current_password' => 'password123', 'password' => 'NewPass123', 'password_confirmation' => 'NewPass123',
        ])->assertOk();

        $this->assertFalse($user->fresh()->must_change_password);
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'NewPass123', 'role' => 'client'])->assertOk();
    }
}
