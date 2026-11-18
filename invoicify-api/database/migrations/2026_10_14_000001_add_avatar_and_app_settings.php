<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Profile picture, stored as a small (256x256) JPEG data URL so no file storage or `storage:link` is needed.
        Schema::table('users', function (Blueprint $table) {
            $table->mediumText('avatar')->nullable()->after('email');
        });

        // Simple key / JSON-value store for owner-editable settings (portal announcement, payment instructions...).
        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('avatar');
        });
    }
};
