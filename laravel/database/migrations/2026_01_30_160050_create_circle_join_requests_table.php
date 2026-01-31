<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_join_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('circle_id')->constrained('circles')->cascadeOnDelete();
            $table->foreignId('me_profile_id')->constrained('me_profiles')->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->string('message', 140)->nullable();
            $table->timestamps();

            $table->index(['circle_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_join_requests');
    }
};
