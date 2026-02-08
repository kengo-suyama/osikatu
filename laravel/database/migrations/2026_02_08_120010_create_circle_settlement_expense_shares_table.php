<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_settlement_expense_shares', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('expense_id');
            $table->unsignedBigInteger('member_id');
            $table->string('member_snapshot_name', 255);
            $table->unsignedInteger('share_yen');
            $table->timestamp('created_at')->nullable();

            $table->foreign('expense_id')->references('id')->on('circle_settlement_expenses')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_settlement_expense_shares');
    }
};
