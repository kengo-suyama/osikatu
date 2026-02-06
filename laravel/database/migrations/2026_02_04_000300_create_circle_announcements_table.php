<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_announcements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('circle_id')->unique()->constrained('circles')->cascadeOnDelete();
            $table->text('text');
            $table->foreignId('updated_by_member_id')
                ->nullable()
                ->constrained('circle_members')
                ->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_announcements');
    }
};
