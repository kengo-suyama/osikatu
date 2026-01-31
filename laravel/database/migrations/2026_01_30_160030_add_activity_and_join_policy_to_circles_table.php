<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('circles', function (Blueprint $table): void {
            $table->timestamp('last_activity_at')->nullable()->after('plan_required');
            $table->string('join_policy', 20)->default('request')->after('is_public');
        });
    }

    public function down(): void
    {
        Schema::table('circles', function (Blueprint $table): void {
            $table->dropColumn(['last_activity_at', 'join_policy']);
        });
    }
};
