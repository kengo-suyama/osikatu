<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('ui_theme_id')->nullable()->after('trial_ends_at');
            $table->boolean('ui_special_bg_enabled')->default(false)->after('ui_theme_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['ui_theme_id', 'ui_special_bg_enabled']);
        });
    }
};
