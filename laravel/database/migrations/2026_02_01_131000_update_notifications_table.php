<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->string('source_type', 40)->nullable()->after('user_id');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->dateTime('notify_at')->nullable()->after('source_id');
            $table->string('link_url')->nullable()->after('body');

            $table->unique(['user_id', 'source_type', 'source_id', 'notify_at'], 'notifications_unique_source');
            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropUnique('notifications_unique_source');
            $table->dropIndex(['user_id', 'read_at']);
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['source_type', 'source_id', 'notify_at', 'link_url']);
        });
    }
};
