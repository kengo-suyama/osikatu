<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_schedules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('circle_id')->constrained('circles')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title', 120);
            $table->dateTime('start_at');
            $table->dateTime('end_at')->nullable();
            $table->boolean('is_all_day')->default(false);
            $table->text('note')->nullable();
            $table->string('location', 120)->nullable();
            $table->string('visibility', 16)->default('members');
            $table->timestamps();

            $table->index(['circle_id', 'start_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_schedules');
    }
};
