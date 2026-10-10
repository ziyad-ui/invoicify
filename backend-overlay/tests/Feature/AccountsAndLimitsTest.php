<?php

namespace Tests\Feature;

use App\Mail\NotificationMail;
use App\Models\Client;
use App\Models\InstallmentPlan;
use App\Models\NotificationLog;
use App\Models\Property;
use App\Models\User;
use App\Services\InvoiceScheduleService;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountsAndLimitsTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role, array $extra = []): User
    {
        return User::create(array_merge([
            'name' => ucfirst($role), 'email' => uniqid().'@example.com',
            'password' => 'password123', 'role' => $role,
        ], $extra));
    }

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

    // ---- change password ----

    public function test_user_can_change_own_password_and_clears_the_forced_change_flag(): void
    {
        $user = $this->makeUser('staff', ['must_change_password' => true]);
        Sanctum::actingAs($user);

        $this->putJson('/api/password', [
            'current_password' => 'password123',
            'password' => 'brandNew123',
            'password_confirmation' => 'brandNew123',
        ])->assertOk();

        $this->assertFalse($user->fresh()->must_change_password);
    }

    public function test_wrong_current_password_is_rejected(): void
    {
        Sanctum::actingAs($this->makeUser('staff'));

        $this->putJson('/api/password', [
            'current_password' => 'nope',
            'password' => 'brandNew123',
            'password_confirmation' => 'brandNew123',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');
    }

    // ---- staff management ----

    public function test_owner_can_create_staff_who_must_change_password(): void
    {
        Sanctum::actingAs($this->makeUser('owner'));

        $res = $this->postJson('/api/staff', ['name' => 'New Staff', 'email' => 'new.staff@example.com'])
            ->assertCreated()
            ->assertJsonPath('data.role', 'staff');

        $temp = $res->json('temporaryPassword');
        $this->assertNotEmpty($temp);

        $staff = User::where('email', 'new.staff@example.com')->first();
        $this->assertTrue($staff->must_change_password);

        $this->postJson('/api/login', ['email' => 'new.staff@example.com', 'password' => $temp, 'role' => 'staff'])
            ->assertOk()
            ->assertJsonPath('user.mustChangePassword', true);
    }

    public function test_staff_and_clients_cannot_manage_staff(): void
    {
        Sanctum::actingAs($this->makeUser('staff'));
        $this->getJson('/api/staff')->assertForbidden();
        $this->postJson('/api/staff', ['name' => 'X', 'email' => 'x@example.com'])->assertForbidden();
    }

    public function test_deactivated_staff_cannot_sign_in_and_is_signed_out(): void
    {
        Sanctum::actingAs($this->makeUser('owner'));
        $staff = $this->makeUser('staff', ['email' => 'gone@example.com']);
        $staff->createToken('t');

        $this->patchJson("/api/staff/{$staff->id}", ['is_active' => false])->assertOk();

        $this->assertSame(0, $staff->tokens()->count());
        $this->postJson('/api/login', ['email' => 'gone@example.com', 'password' => 'password123', 'role' => 'staff'])
            ->assertStatus(422);
    }

    public function test_owner_account_cannot_be_edited_through_staff_endpoints(): void
    {
        $owner = $this->makeUser('owner');
        Sanctum::actingAs($owner);

        $this->patchJson("/api/staff/{$owner->id}", ['is_active' => false])->assertNotFound();
        $this->postJson("/api/staff/{$owner->id}/reset-password")->assertNotFound();
    }

    public function test_staff_can_reset_a_clients_portal_password(): void
    {
        $client = $this->makeClient();
        $clientUser = User::create([
            'name' => $client->name, 'email' => $client->email, 'password' => 'oldPass123',
            'role' => 'client', 'client_id' => $client->id,
        ]);
        Sanctum::actingAs($this->makeUser('staff'));

        $temp = $this->postJson("/api/clients/{$client->id}/reset-password")
            ->assertOk()->json('temporaryPassword');

        $this->assertTrue($clientUser->fresh()->must_change_password);
        $this->postJson('/api/login', ['email' => $client->email, 'password' => $temp, 'role' => 'client'])->assertOk();
    }

    // ---- daily email cap ----

    public function test_daily_email_limit_stops_further_sends(): void
    {
        Mail::fake();
        config(['invoicify.daily_email_limit' => 1]);

        $client = $this->makeClient();
        $invoice = $client->invoices()->orderBy('due_date')->first();
        $service = app(NotificationService::class);

        $first = $service->sendOverdueNotice($invoice);
        $second = $service->sendOverdueNotice($invoice);

        $this->assertSame('Sent', $first->status);
        $this->assertSame('Failed', $second->status);
        $this->assertStringContainsString('Daily email limit', $second->error);
        Mail::assertSent(NotificationMail::class, 1);
    }

    public function test_no_limit_by_default(): void
    {
        Mail::fake();
        $client = $this->makeClient();
        $invoice = $client->invoices()->orderBy('due_date')->first();
        $service = app(NotificationService::class);

        $this->assertSame('Sent', $service->sendOverdueNotice($invoice)->status);
        $this->assertSame('Sent', $service->sendOverdueNotice($invoice)->status);
        $this->assertSame(2, NotificationLog::where('status', 'Sent')->count());
    }
}
