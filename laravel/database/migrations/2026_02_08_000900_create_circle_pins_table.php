<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circle_pins', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('circle_id')->constrained('circles')->cascadeOnDelete();

            // Prefer circle-member author (role/plan checks rely on membership).
            $table->foreignId('created_by_member_id')->nullable()
                ->constrained('circle_members')->nullOnDelete();

            $table->string('title', 120);
            $table->string('url', 2048)->nullable();
            $table->text('body');

            // Phase2: optional structured data; can remain null until Phase3.
            $table->json('checklist_json')->nullable();

            // Phase2+: deterministic ordering foundation (lower is higher priority).
            $table->integer('sort_order')->nullable();

            $table->timestamp('pinned_at');

            // Backfill/compat bridge from Phase1 (posts.is_pinned).
            $table->foreignId('source_post_id')->nullable()
                ->constrained('posts')->nullOnDelete();

            $table->timestamps();

            $table->unique('source_post_id');
            $table->index(['circle_id', 'sort_order']);
            $table->index(['circle_id', 'updated_at']);
            $table->index(['circle_id', 'pinned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circle_pins');
    }
};

