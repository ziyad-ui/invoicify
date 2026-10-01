<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('number')->nullable()->unique(); // INV-00012, set right after insert
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('installment_plan_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence'); // 1..term_months
            $table->decimal('amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->date('due_date')->index();
            $table->date('paid_at')->nullable();
            // Prevent the scheduled job from emailing the same notice twice.
            $table->timestamp('reminder_sent_at')->nullable();
            $table->timestamp('overdue_notice_sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
