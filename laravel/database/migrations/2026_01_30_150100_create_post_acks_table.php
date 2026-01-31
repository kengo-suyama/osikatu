<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_acks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->foreignId('circle_member_id')->constrained('circle_members')->cascadeOnDelete();
            $table->timestamp('acked_at')->nullable();
            $table->timestamps();
            $table->unique(['post_id', 'circle_member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_acks');
    }
};
