<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_schedule_participants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('circle_schedule_id')->constrained('circle_schedules')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 16)->default('accepted');
            $table->dateTime('read_at')->nullable();
            $table->timestamps();

            $table->index(['circle_schedule_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_schedule_participants');
    }
};
