<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->foreignId('author_member_id')->nullable()->after('circle_id')
                ->constrained('circle_members')->nullOnDelete();
            $table->unsignedInteger('like_count')->default(0)->after('tags');
            $table->string('pin_kind', 20)->nullable()->after('is_pinned');
            $table->timestamp('pin_due_at')->nullable()->after('pin_kind');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('author_member_id');
            $table->dropColumn(['like_count', 'pin_kind', 'pin_due_at']);
        });
    }
};
