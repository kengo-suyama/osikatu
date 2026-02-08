<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('circle_settlement_expenses', function (Blueprint $table): void {
            $table->timestamp('voided_at')->nullable()->after('status');
            $table->unsignedBigInteger('voided_by_member_id')->nullable()->after('voided_at');
        });
    }

    public function down(): void
    {
        Schema::table('circle_settlement_expenses', function (Blueprint $table): void {
            $table->dropColumn(['voided_at', 'voided_by_member_id']);
        });
    }
};
