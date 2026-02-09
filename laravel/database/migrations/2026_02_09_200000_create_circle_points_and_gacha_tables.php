<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_points_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('circle_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('actor_user_id')->nullable();
            $table->integer('delta');
            $table->string('reason', 64);
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['circle_id', 'created_at']);
        });

        Schema::create('circle_points_balances', function (Blueprint $table) {
            $table->foreignId('circle_id')->primary()->constrained()->cascadeOnDelete();
            $table->integer('balance')->default(0);
            $table->timestamp('updated_at')->useCurrent();
        });

        Schema::create('circle_gacha_draws', function (Blueprint $table) {
            $table->id();
            $table->foreignId('circle_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('actor_user_id');
            $table->integer('cost_points');
            $table->string('reward_key', 128);
            $table->string('reward_rarity', 16);
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['circle_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_gacha_draws');
        Schema::dropIfExists('circle_points_balances');
        Schema::dropIfExists('circle_points_ledgers');
    }
};
