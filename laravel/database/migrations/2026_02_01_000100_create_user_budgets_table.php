<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_budgets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('year_month', 7);
            $table->integer('budget_int')->default(0);
            $table->integer('spent_int')->default(0);
            $table->string('currency', 3)->default('JPY');
            $table->timestamps();

            $table->unique(['user_id', 'year_month']);
            $table->index(['user_id', 'year_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_budgets');
    }
};
