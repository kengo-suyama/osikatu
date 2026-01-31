<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('post_media', function (Blueprint $table): void {
            $table->string('url')->nullable()->after('type');
            $table->string('mime', 60)->nullable()->after('url');
            $table->unsignedInteger('width')->nullable()->after('mime');
            $table->unsignedInteger('height')->nullable()->after('width');
        });
    }

    public function down(): void
    {
        Schema::table('post_media', function (Blueprint $table): void {
            $table->dropColumn(['url', 'mime', 'width', 'height']);
        });
    }
};
