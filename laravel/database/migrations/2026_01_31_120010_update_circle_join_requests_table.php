<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('circle_join_requests', function (Blueprint $table): void {
            $table->foreignId('reviewed_by_member_id')->nullable()->after('message')
                ->constrained('circle_members')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by_member_id');
            $table->unique(['circle_id', 'me_profile_id']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE circle_join_requests MODIFY message VARCHAR(200) NULL');
        }
    }

    public function down(): void
    {
        Schema::table('circle_join_requests', function (Blueprint $table): void {
            $table->dropUnique(['circle_id', 'me_profile_id']);
            $table->dropColumn(['reviewed_at']);
            $table->dropConstrainedForeignId('reviewed_by_member_id');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE circle_join_requests MODIFY message VARCHAR(140) NULL');
        }
    }
};
