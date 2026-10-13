<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Optional map pin for a property. Every column is nullable, so existing properties keep working
     * and a client simply has "no pin yet" until staff drop one.
     */
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('total_price');   // -90  .. 90
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');     // -180 .. 180
            $table->string('address', 255)->nullable()->after('longitude');         // full address / phase & block
            $table->text('location_notes')->nullable()->after('address');           // landmark, access directions, community notes
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'address', 'location_notes']);
        });
    }
};
