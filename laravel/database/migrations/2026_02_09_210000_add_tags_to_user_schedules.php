<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_schedules', function (Blueprint $table) {
            $table->json('tags')->nullable()->after('location');
        });
    }

    public function down(): void
    {
        Schema::table('user_schedules', function (Blueprint $table) {
            $table->dropColumn('tags');
        });
    }
};
