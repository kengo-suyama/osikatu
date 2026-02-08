<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_schedule_proposals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('circle_id')->constrained('circles')->cascadeOnDelete();
            $table->unsignedBigInteger('created_by_member_id');
            $table->string('title', 120);
            $table->dateTime('start_at');
            $table->dateTime('end_at')->nullable();
            $table->boolean('is_all_day')->default(false);
            $table->text('note')->nullable();
            $table->string('location', 120)->nullable();
            $table->string('status', 20)->default('pending'); // pending|approved|rejected|canceled
            $table->unsignedBigInteger('reviewed_by_member_id')->nullable();
            $table->dateTime('reviewed_at')->nullable();
            $table->text('review_comment')->nullable();
            $table->unsignedBigInteger('approved_schedule_id')->nullable();
            $table->timestamps();

            $table->index(['circle_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_schedule_proposals');
    }
};
