<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bill_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('bill_id')->constrained('split_bills')->cascadeOnDelete();
            $table->foreignId('circle_member_id')->constrained('circle_members')->cascadeOnDelete();
            $table->integer('amount_yen');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_assignments');
    }
};
