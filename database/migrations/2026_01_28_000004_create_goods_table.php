<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('goods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('oshi_id')->constrained('oshis')->cascadeOnDelete();
            $table->string('name');
            $table->string('category');
            $table->date('purchase_date');
            $table->unsignedInteger('price');
            $table->string('image_path')->nullable();
            $table->text('memo')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goods');
    }
};
