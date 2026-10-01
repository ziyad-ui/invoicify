<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_number')->nullable()->unique(); // RCPT-2026-000123
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('mode', 30);               // Cash | Bank Transfer | Check
            $table->string('reference', 80)->nullable()->unique(); // null for cash
            $table->string('type', 30);               // Partial Payment | Full Payment | Final Payment
            $table->date('paid_at');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index('paid_at');
        });

        // Which invoices a payment was applied to (a payment can span several).
        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_allocations');
        Schema::dropIfExists('payments');
    }
};
