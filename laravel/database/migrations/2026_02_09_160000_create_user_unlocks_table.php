<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_unlocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('item_type', 32);
            $table->string('item_key', 64);
            $table->string('rarity', 16);
            $table->string('source', 32);
            $table->timestamp('acquired_at')->useCurrent();
            $table->timestamps();

            $table->unique(['user_id', 'item_type', 'item_key'], 'uniq_user_unlocks_user_item');
            $table->index(['user_id', 'acquired_at'], 'idx_user_unlocks_user_acquired');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_unlocks');
    }
};

