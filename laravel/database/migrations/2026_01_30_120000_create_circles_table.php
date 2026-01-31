<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circles', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 50);
            $table->text('description')->nullable();
            $table->string('oshi_tag', 30)->nullable();
            $table->string('icon_path')->nullable();
            $table->unsignedInteger('max_members')->default(30);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circles');
    }
};
