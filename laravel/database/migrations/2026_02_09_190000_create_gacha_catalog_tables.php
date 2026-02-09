<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gacha_items', function (Blueprint $table) {
            $table->id();
            $table->string('item_type', 32);
            $table->string('item_key', 64);
            $table->string('name');
            $table->string('rarity', 8);
            $table->string('description')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['item_type', 'item_key']);
            $table->index('rarity');
        });

        Schema::create('gacha_pools', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->unsignedInteger('cost')->default(100);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('gacha_pool_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pool_id')->constrained('gacha_pools')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('gacha_items')->cascadeOnDelete();
            $table->unsignedInteger('weight')->default(1);
            $table->timestamps();

            $table->unique(['pool_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gacha_pool_items');
        Schema::dropIfExists('gacha_pools');
        Schema::dropIfExists('gacha_items');
    }
};
