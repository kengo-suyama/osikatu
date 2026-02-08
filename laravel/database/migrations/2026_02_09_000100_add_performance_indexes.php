<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // circle_pins: frequently queried by circle_id ordered by sort_order
        if (Schema::hasTable('circle_pins')) {
            Schema::table('circle_pins', function (Blueprint $table) {
                $table->index(['circle_id', 'sort_order'], 'idx_circle_pins_circle_sort');
            });
        }

        // notifications: user's unread notifications query
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index(['user_id', 'read_at'], 'idx_notifications_user_read');
            });
        }

        // circle_schedule_proposals: filtered by circle + status + date
        if (Schema::hasTable('circle_schedule_proposals')) {
            Schema::table('circle_schedule_proposals', function (Blueprint $table) {
                $table->index(['circle_id', 'status', 'date'], 'idx_proposals_circle_status_date');
            });
        }

        // circle_settlement_expenses: queried by circle ordered by created_at
        if (Schema::hasTable('circle_settlement_expenses')) {
            Schema::table('circle_settlement_expenses', function (Blueprint $table) {
                $table->index(['circle_id', 'created_at'], 'idx_settlement_expenses_circle_created');
            });
        }

        // operation_logs: queried by circle_id + created_at
        if (Schema::hasTable('operation_logs')) {
            Schema::table('operation_logs', function (Blueprint $table) {
                $table->index(['circle_id', 'created_at'], 'idx_operation_logs_circle_created');
            });
        }

        // chat_messages: queried by circle_id + created_at for pagination
        if (Schema::hasTable('chat_messages')) {
            Schema::table('chat_messages', function (Blueprint $table) {
                $table->index(['circle_id', 'created_at'], 'idx_chat_messages_circle_created');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('circle_pins')) {
            Schema::table('circle_pins', function (Blueprint $table) {
                $table->dropIndex('idx_circle_pins_circle_sort');
            });
        }
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropIndex('idx_notifications_user_read');
            });
        }
        if (Schema::hasTable('circle_schedule_proposals')) {
            Schema::table('circle_schedule_proposals', function (Blueprint $table) {
                $table->dropIndex('idx_proposals_circle_status_date');
            });
        }
        if (Schema::hasTable('circle_settlement_expenses')) {
            Schema::table('circle_settlement_expenses', function (Blueprint $table) {
                $table->dropIndex('idx_settlement_expenses_circle_created');
            });
        }
        if (Schema::hasTable('operation_logs')) {
            Schema::table('operation_logs', function (Blueprint $table) {
                $table->dropIndex('idx_operation_logs_circle_created');
            });
        }
        if (Schema::hasTable('chat_messages')) {
            Schema::table('chat_messages', function (Blueprint $table) {
                $table->dropIndex('idx_chat_messages_circle_created');
            });
        }
    }
};
