<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('circle_invites', function (Blueprint $table): void {
            $table->string('role', 20)->default('member')->after('token');
            $table->timestamp('revoked_at')->nullable()->after('expires_at');
            $table->string('created_by_device_id', 64)->nullable()->after('created_by');
        });
    }

    public function down(): void
    {
        Schema::table('circle_invites', function (Blueprint $table): void {
            $table->dropColumn(['role', 'revoked_at', 'created_by_device_id']);
        });
    }
};
