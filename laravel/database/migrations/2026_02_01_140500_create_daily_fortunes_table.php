<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('daily_fortunes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->index();
            $table->date('fortune_date');
            $table->unsignedSmallInteger('luck_score');
            $table->string('lucky_color', 64);
            $table->string('lucky_item', 64);
            $table->string('message', 140);
            $table->string('good_action', 120);
            $table->string('bad_action', 120);
            $table->timestamps();
            $table->unique(['user_id', 'fortune_date'], 'daily_fortunes_user_date_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_fortunes');
    }
};
