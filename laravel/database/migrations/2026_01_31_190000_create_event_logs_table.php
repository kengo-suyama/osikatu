<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('me_profile_id')->nullable()->constrained('me_profiles')->nullOnDelete();
            $table->foreignId('circle_id')->nullable()->constrained('circles')->nullOnDelete();
            $table->string('event_name', 50)->index();
            $table->string('screen', 255)->index();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_logs');
    }
};
