<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sendgrid_event_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('event_type', 50)->index();
            $table->string('email')->index();
            $table->bigInteger('sg_event_id')->nullable();
            $table->timestamp('event_timestamp')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sendgrid_event_receipts');
    }
};
