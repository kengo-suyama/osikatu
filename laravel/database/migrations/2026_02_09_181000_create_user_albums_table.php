<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_albums', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('date', 10)->nullable(); // YYYY-MM-DD
            $table->text('note')->nullable();
            $table->json('media')->nullable(); // [{id,type,path,url,name,mime,sizeBytes,width,height}]
            $table->timestamps();

            $table->index(['user_id', 'id'], 'idx_user_albums_user_id_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_albums');
    }
};

