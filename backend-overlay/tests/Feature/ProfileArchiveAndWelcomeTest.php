<?php

namespace Tests\Feature;

use App\Mail\NotificationMail;
use App\Models\Client;
use App\Models\InstallmentPlan;
use App\Models\NotificationLog;
use App\Models\Property;
use App\Models\User;
use App\Services\InvoiceScheduleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileArchiveAndWelcomeTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role, array $extra = []): User
    {
        return User::create(array_merge([
            'name' => ucfirst($role), 'email' => uniqid().'@example.com',
            'password' => 'password123', 'role' => $role,
        ], $extra));
    }

    /** 3 installments of 1,000; the first was due 10 days ago. */
    private function makeClient(array $extra = []): Client
    {
        $client = Client::create(array_merge(['name' => 'Test Client', 'email' => uniqid().'@example.com'], $extra));
        $property = Property::create(['client_id' => $client->id, 'name' => 'Lot 1', 'type' => 'Open Lot', 'total_price' => 3000]);
        $plan = InstallmentPlan::create([
            'client_id' => $client->id, 'property_id' => $property->id,
            'monthly_amount' => 1000, 'term_months' => 3, 'first_due_date' => today()->subDays(10),
        ]);
        app(InvoiceScheduleService::class)->generate($plan);

        return $client;
    }

    private function makeClientLogin(Client $client): User
    {
        return User::create([
            'name' => $client->name, 'email' => $client->email, 'password' => 'password123',
            'role' => 'client', 'client_id' => $client->id,
        ]);
    }

    // ---- smart login ----

    public function test_check_role_detects_the_account_type_without_a_role_tab(): void
    {
        $owner = $this->makeUser('owner', ['email' => 'boss@example.com']);
        $this->makeUser('staff', ['email' => 'desk@example.com']);
        $this->makeUser('client', ['email' => 'buyer@example.com', 'is_active' => false]);

        $this->getJson('/api/auth/check-role?email=boss@example.com')->assertOk()->assertJsonPath('role', 'owner');
        $this->getJson('/api/auth/check-role?email=DESK@example.com')->assertOk()->assertJsonPath('role', 'staff');
        $this->getJson('/api/auth/check-role?email=buyer@example.com')->assertOk()->assertJsonPath('role', null); // inactive
        $this->getJson('/api/auth/check-role?email=nobody@example.com')->assertOk()->assertJsonPath('role', null);
        $this->getJson('/api/auth/check-role?email=not-an-email')->assertOk()->assertJsonPath('role', null);
        $this->assertNotNull($owner);
    }

    public function test_login_works_without_a_role_and_returns_the_real_one(): void
    {
        $this->makeUser('staff', ['email' => 'desk@example.com']);

        $this->postJson('/api/login', ['email' => 'Desk@Example.com', 'password' => 'password123'])
            ->assertOk()
            ->assertJsonPath('user.role', 'staff');

        $this->postJson('/api/login', ['email' => 'desk@example.com', 'password' => 'wrong'])->assertStatus(422);
    }

    // ---- self-service profile ----

    public function test_email_change_needs_current_password_and_syncs_the_client_record(): void
    {
        $client = $this->makeClient();
        $user = $this->makeClientLogin($client);
        Sanctum::actingAs($user);

        $this->postJson('/api/user/update-email', ['email' => 'new@example.com', 'current_password' => 'nope'])
            ->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->postJson('/api/user/update-email', ['email' => 'New@Example.com', 'current_password' => 'password123'])
            ->assertOk()->assertJsonPath('user.email', 'new@example.com');

        $this->assertSame('new@example.com', $user->fresh()->email);
        $this->assertSame('new@example.com', $client->fresh()->email);
    }

    public function test_email_change_rejects_an_address_already_in_use(): void
    {
        $this->makeUser('staff', ['email' => 'taken@example.com']);
        Sanctum::actingAs($this->makeUser('staff'));

        $this->postJson('/api/user/update-email', ['email' => 'taken@example.com', 'current_password' => 'password123'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_name_and_password_endpoints(): void
    {
        $client = $this->makeClient();
        $user = $this->makeClientLogin($client);
        Sanctum::actingAs($user);

        $this->postJson('/api/user/update-profile', ['name' => 'Renamed Person'])->assertOk();
        $this->assertSame('Renamed Person', $client->fresh()->name);

        $this->postJson('/api/user/change-password', [
            'current_password' => 'password123', 'password' => 'BrandNew123', 'password_confirmation' => 'BrandNew123',
        ])->assertOk();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'BrandNew123'])->assertOk();
    }

    // ---- welcome email ----

    public function test_adding_a_client_emails_their_portal_login_and_never_stores_the_password(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->makeUser('staff'));

        $res = $this->postJson('/api/clients', [
            'name' => 'New Buyer', 'email' => 'New.Buyer@example.com', 'property_name' => 'Unit 1', 'property_type' => 'Open Lot',
            'total_price' => 120000, 'monthly_amount' => 10000, 'term_months' => 12, 'first_due_date' => today()->addMonth()->toDateString(),
        ])->assertCreated()
            ->assertJsonPath('welcomeEmail.sent', true)
            ->assertJsonPath('temporaryPassword', null);   // emailed, so not exposed to staff

        Mail::assertSent(NotificationMail::class, fn ($m) => $m->hasTo('new.buyer@example.com') && $m->actionUrl !== null);

        $mail = Mail::sent(NotificationMail::class)->first();
        $this->assertSame(1, preg_match('/Temporary password: (\w+)/', $mail->body, $found));

        $log = NotificationLog::where('type', 'Client Welcome')->first();
        $this->assertSame('Sent', $log->status);
        $this->assertStringNotContainsString($found[1], $log->body);

        $this->postJson('/api/login', ['email' => 'new.buyer@example.com', 'password' => $found[1]])
            ->assertOk()->assertJsonPath('user.mustChangePassword', true);
    }

    // ---- editing the plan ----

    public function test_editing_monthly_and_term_rebuilds_only_the_untouched_schedule(): void
    {
        $client = $this->makeClient();
        Sanctum::actingAs($this->makeUser('staff'));

        $res = $this->putJson("/api/clients/{$client->id}", ['monthly_amount' => 1200, 'term_months' => 4])->assertOk();
        $this->assertCount(4, $res->json('data.invoices'));
        $this->assertEquals(4800, $res->json('data.balance'));
        $this->assertEquals(1200, $res->json('data.plan.monthly'));

        // Part-pay invoice #1, then lower the monthly: the touched invoice keeps its amount.
        $this->postJson("/api/clients/{$client->id}/payments", ['amount' => 500, 'mode' => 'Cash'])->assertCreated();
        $res = $this->putJson("/api/clients/{$client->id}", ['monthly_amount' => 900])->assertOk();
        $this->assertEquals(1200 + 900 * 3 - 500, $res->json('data.balance'));

        // Shorten to 1 month: allowed because only invoice #1 has money on it.
        $res = $this->putJson("/api/clients/{$client->id}", ['term_months' => 1])->assertOk();
        $this->assertCount(1, $res->json('data.invoices'));
    }

    public function test_term_cannot_be_cut_below_an_installment_that_already_has_a_payment(): void
    {
        $client = $this->makeClient();
        Sanctum::actingAs($this->makeUser('staff'));

        $this->postJson("/api/clients/{$client->id}/payments", ['amount' => 1100, 'mode' => 'Cash'])->assertCreated();

        $this->putJson("/api/clients/{$client->id}", ['term_months' => 1])
            ->assertStatus(422)->assertJsonValidationErrors('term_months');
        $this->assertSame(3, $client->invoices()->count());
    }

    // ---- archive / restore / permanent delete ----

    public function test_archive_restore_and_permanent_delete(): void
    {
        $client = $this->makeClient();
        $login = $this->makeClientLogin($client);
        $staff = $this->makeUser('staff');
        $owner = $this->makeUser('owner');

        Sanctum::actingAs($staff);
        $this->postJson("/api/clients/{$client->id}/payments", ['amount' => 3000, 'mode' => 'Cash'])->assertCreated();

        $this->deleteJson("/api/clients/{$client->id}")->assertNoContent();
        $this->assertFalse($login->fresh()->is_active);

        $this->getJson('/api/clients')->assertJsonCount(0, 'data');
        $this->getJson('/api/clients?archived=1')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $client->id);

        $this->postJson("/api/clients/{$client->id}/restore")->assertOk();
        $this->assertTrue($login->fresh()->is_active);
        $this->getJson('/api/clients')->assertJsonCount(1, 'data');

        // Permanent delete: only for archived clients, and only the owner may do it.
        $this->deleteJson("/api/clients/{$client->id}/permanent")->assertForbidden();
        $this->deleteJson("/api/clients/{$client->id}")->assertNoContent();

        Sanctum::actingAs($owner);
        $this->deleteJson("/api/clients/{$client->id}/permanent")->assertNoContent();
        $this->assertSame(0, Client::withTrashed()->count());
        $this->assertSame(0, User::where('client_id', $client->id)->count());
    }

    public function test_permanent_delete_refuses_a_client_who_is_not_archived(): void
    {
        $client = $this->makeClient();
        Sanctum::actingAs($this->makeUser('owner'));

        $this->deleteJson("/api/clients/{$client->id}/permanent")->assertNotFound();
    }

    // ---- staff deletion ----

    public function test_owner_can_delete_staff_but_not_the_owner_account(): void
    {
        $owner = $this->makeUser('owner');
        $staff = $this->makeUser('staff');
        Sanctum::actingAs($owner);

        $this->deleteJson("/api/staff/{$staff->id}")->assertNoContent();
        $this->assertNull(User::find($staff->id));

        $this->deleteJson("/api/staff/{$owner->id}")->assertNotFound();
        $this->assertNotNull(User::find($owner->id));
    }

    public function test_staff_cannot_delete_staff(): void
    {
        $staff = $this->makeUser('staff');
        $other = $this->makeUser('staff');
        Sanctum::actingAs($staff);

        $this->deleteJson("/api/staff/{$other->id}")->assertForbidden();
    }

    public function test_staff_password_reset_is_emailed(): void
    {
        Mail::fake();
        $staff = $this->makeUser('staff', ['email' => 'desk@example.com']);
        Sanctum::actingAs($this->makeUser('owner'));

        $this->postJson("/api/staff/{$staff->id}/reset-password")
            ->assertOk()->assertJsonPath('emailed', true);

        Mail::assertSent(NotificationMail::class, fn ($m) => $m->hasTo('desk@example.com'));
    }

    // ---- dashboard ----

    public function test_owner_dashboard_reports_this_months_revenue(): void
    {
        $client = $this->makeClient();
        Sanctum::actingAs($this->makeUser('staff'));
        $this->postJson("/api/clients/{$client->id}/payments", ['amount' => 1000, 'mode' => 'Cash'])->assertCreated();

        Sanctum::actingAs($this->makeUser('owner'));
        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('data.stats.revenueThisMonth', 1000)
            ->assertJsonPath('data.stats.revenueCollected', 1000)
            ->assertJsonStructure(['data' => ['monthlyCollections' => [['month', 'label', 'amount']], 'period']]);
    }
}
