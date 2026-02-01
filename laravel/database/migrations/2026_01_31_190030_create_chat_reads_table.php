<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_reads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('circle_id')->constrained('circles')->cascadeOnDelete();
            $table->foreignId('circle_member_id')->constrained('circle_members')->cascadeOnDelete();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['circle_id', 'circle_member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_reads');
    }
};
