<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_ui_settings', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('circle_id')->unique();
            $table->string('circle_theme_id')->nullable();
            $table->boolean('special_bg_enabled')->default(false);
            $table->string('special_bg_variant')->nullable();
            $table->unsignedBigInteger('updated_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('circle_id')->references('id')->on('circles')->onDelete('cascade');
            $table->foreign('updated_by_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_ui_settings');
    }
};
