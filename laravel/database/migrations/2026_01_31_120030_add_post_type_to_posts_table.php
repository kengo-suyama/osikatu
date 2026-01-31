<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->string('post_type', 20)->default('post')->after('user_id');
            $table->index(['circle_id', 'post_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->dropIndex(['circle_id', 'post_type', 'created_at']);
            $table->dropColumn('post_type');
        });
    }
};
