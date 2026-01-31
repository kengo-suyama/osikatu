<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('me_profiles', function (Blueprint $table): void {
            $table->id();
            $table->string('device_id', 64)->unique();
            $table->string('nickname', 50)->nullable();
            $table->string('avatar_url')->nullable();
            $table->string('initial', 4)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('me_profiles');
    }
};
