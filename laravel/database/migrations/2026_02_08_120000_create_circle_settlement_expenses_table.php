<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_settlement_expenses', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('circle_id');
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('payer_member_id');
            $table->string('title', 255);
            $table->unsignedInteger('amount_yen');
            $table->string('split_type', 10)->default('equal');
            $table->date('occurred_on');
            $table->text('note')->nullable();
            $table->string('status', 10)->default('active');
            $table->unsignedBigInteger('replaced_by_expense_id')->nullable();
            $table->unsignedBigInteger('replaces_expense_id')->nullable();
            $table->timestamps();

            $table->foreign('circle_id')->references('id')->on('circles')->cascadeOnDelete();
            $table->index(['circle_id', 'status', 'occurred_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_settlement_expenses');
    }
};
