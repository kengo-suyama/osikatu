<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notice_acks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('notice_id')->constrained('circle_notices')->cascadeOnDelete();
            $table->foreignId('circle_member_id')->constrained('circle_members')->cascadeOnDelete();
            $table->timestamp('acked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notice_acks');
    }
};
