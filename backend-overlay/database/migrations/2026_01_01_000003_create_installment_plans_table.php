<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('installment_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->decimal('monthly_amount', 12, 2);
            $table->unsignedSmallInteger('term_months');
            $table->date('first_due_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('installment_plans');
    }
};
