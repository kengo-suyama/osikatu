<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('circles', function (Blueprint $table): void {
            $table->string('oshi_label', 60)->nullable()->after('description');
            $table->json('oshi_tags')->nullable()->after('oshi_tag');
            $table->boolean('is_public')->default(false)->after('oshi_tags');
            $table->string('plan_required', 20)->default('free')->after('plan');
        });
    }

    public function down(): void
    {
        Schema::table('circles', function (Blueprint $table): void {
            $table->dropColumn(['oshi_label', 'oshi_tags', 'is_public', 'plan_required']);
        });
    }
};
