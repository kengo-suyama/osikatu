<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('operation_logs')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            // MySQL: generated column extracted from JSON meta
            DB::statement("ALTER TABLE operation_logs ADD COLUMN meta_request_id VARCHAR(255) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(meta, '$.request_id'))) STORED");
            Schema::table('operation_logs', function (Blueprint $table) {
                $table->index('meta_request_id', 'idx_oplog_meta_request_id');
            });
        } else {
            // SQLite fallback: simple nullable column + index
            Schema::table('operation_logs', function (Blueprint $table) {
                $table->string('meta_request_id', 255)->nullable()->after('meta');
                $table->index('meta_request_id', 'idx_oplog_meta_request_id');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('operation_logs')) {
            return;
        }

        Schema::table('operation_logs', function (Blueprint $table) {
            $table->dropIndex('idx_oplog_meta_request_id');
            $table->dropColumn('meta_request_id');
        });
    }
};
