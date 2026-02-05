<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_media', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('circle_id')->constrained('circles')->cascadeOnDelete();
            $table->foreignId('created_by_member_id')
                ->nullable()
                ->constrained('circle_members')
                ->nullOnDelete();
            $table->string('type', 20)->default('image');
            $table->string('path');
            $table->string('url');
            $table->string('mime', 120)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('caption', 200)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['circle_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_media');
    }
};
