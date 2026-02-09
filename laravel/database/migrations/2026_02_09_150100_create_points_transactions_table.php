<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('points_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('circle_id')->nullable()->constrained('circles')->nullOnDelete();
            $table->integer('delta');
            $table->string('reason', 64);
            $table->json('source_meta')->nullable();
            $table->string('request_id', 36)->nullable()->index();
            $table->string('idempotency_key', 64)->nullable();
            $table->timestamp('created_at')->useCurrent();

            // Idempotency: allow multiple nulls; enforce uniqueness when key is present.
            $table->unique(['user_id', 'circle_id', 'idempotency_key'], 'uniq_points_tx_user_circle_idem');
            $table->index(['user_id', 'circle_id', 'created_at'], 'idx_points_tx_user_circle_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('points_transactions');
    }
};

