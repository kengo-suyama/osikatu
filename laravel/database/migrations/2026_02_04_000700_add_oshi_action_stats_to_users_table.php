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
            $table->string('current_title_id', 12)->nullable()->after('trial_ends_at');
            $table->unsignedInteger('oshi_action_total')->default(0)->after('current_title_id');
            $table->unsignedInteger('oshi_action_streak')->default(0)->after('oshi_action_total');
            $table->date('oshi_action_last_date')->nullable()->after('oshi_action_streak');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'current_title_id',
                'oshi_action_total',
                'oshi_action_streak',
                'oshi_action_last_date',
            ]);
        });
    }
};
