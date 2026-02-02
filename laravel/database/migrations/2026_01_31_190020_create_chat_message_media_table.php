<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_message_media', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('chat_message_id')->constrained('chat_messages')->cascadeOnDelete();
            $table->string('type', 20)->default('image');
            $table->string('path');
            $table->string('url');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['chat_message_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_message_media');
    }
};
