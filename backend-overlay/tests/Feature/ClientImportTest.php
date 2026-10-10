<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientImportTest extends TestCase
{
    use RefreshDatabase;

    private const HEADER = 'Name,Email,Phone,Property Name,Property Type,Total Price,Monthly Amount,Term Months,First Due Date';

    private function login(string $role = User::ROLE_STAFF): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Staff', 'email' => uniqid().'@example.com', 'password' => 'password123', 'role' => $role,
        ]));
    }

    private function upload(string ...$lines): \Illuminate\Testing\TestResponse
    {
        $csv = implode("\n", array_merge([self::HEADER], $lines));

        return $this->postJson('/api/clients/import', [
            'file' => UploadedFile::fake()->createWithContent('clients.csv', $csv),
        ]);
    }

    public function test_valid_file_creates_clients_invoices_and_logins(): void
    {
        $this->login();

        $this->upload(
            'Maria Santos,maria@example.com,9175550142,"Unit 12B, Sunview",Residential Condominium,"₱1,850,000",8500,12,2027-01-15',
            'Juan Dela Cruz,juan@example.com,,Lot 4,Open Lot,950000,12000,6,01/20/2027',
        )->assertCreated()
            ->assertJsonPath('imported', 2)
            ->assertJsonCount(2, 'clients');

        $this->assertSame(2, Client::count());
        $this->assertSame(18, Invoice::count()); // 12 + 6
        $this->assertSame(2, User::where('role', User::ROLE_CLIENT)->count());
        $this->assertSame('09175550142', Client::where('email', 'maria@example.com')->value('phone'));
        $this->assertSame('2027-01-20', Invoice::whereHas('client', fn ($q) => $q->where('email', 'juan@example.com'))->orderBy('sequence')->first()->due_date->toDateString());
    }

    public function test_one_bad_row_imports_nothing(): void
    {
        $this->login();

        $this->upload(
            'Maria Santos,maria@example.com,,Unit 1,Open Lot,1000,100,10,2027-01-15',
            'Bad Row,not-an-email,,Unit 2,Open Lot,1000,100,10,2027-01-15',
        )->assertStatus(422)
            ->assertJsonPath('rowErrors.0.row', 3);

        $this->assertSame(0, Client::count());
    }

    public function test_duplicate_emails_are_rejected(): void
    {
        $this->login();

        $this->upload(
            'A,same@example.com,,Unit 1,Open Lot,1000,100,10,2027-01-15',
            'B,same@example.com,,Unit 2,Open Lot,1000,100,10,2027-01-15',
        )->assertStatus(422);

        $this->assertSame(0, Client::count());
    }

    public function test_missing_column_is_reported(): void
    {
        $this->login();

        $this->postJson('/api/clients/import', [
            'file' => UploadedFile::fake()->createWithContent('clients.csv', "Name,Email\nA,a@example.com"),
        ])->assertStatus(422);
    }

    public function test_clients_cannot_import(): void
    {
        $this->login(User::ROLE_CLIENT);

        $this->upload('A,a@example.com,,Unit 1,Open Lot,1000,100,10,2027-01-15')->assertForbidden();
    }
}
