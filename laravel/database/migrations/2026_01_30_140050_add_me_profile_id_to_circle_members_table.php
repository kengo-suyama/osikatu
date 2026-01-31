<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('circle_members', function (Blueprint $table): void {
            $table->foreignId('me_profile_id')->nullable()->after('circle_id')
                ->constrained('me_profiles')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('circle_members', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('me_profile_id');
        });
    }
};
