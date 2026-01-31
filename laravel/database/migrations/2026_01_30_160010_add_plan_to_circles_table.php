<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('circles', function (Blueprint $table): void {
            $table->string('plan', 20)->default('free')->after('max_members');
        });
    }

    public function down(): void
    {
        Schema::table('circles', function (Blueprint $table): void {
            $table->dropColumn(['plan']);
        });
    }
};
