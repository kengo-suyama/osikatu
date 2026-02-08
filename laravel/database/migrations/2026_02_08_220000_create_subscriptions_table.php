<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('stripe_customer_id')->nullable()->index();
            $table->string('stripe_subscription_id')->nullable()->unique();

            $table->string('plan', 32)->default('plus');
            $table->string('status', 32)->default('active')->index();

            $table->timestamp('current_period_end')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);

            $table->timestamps();

            $table->unique(['user_id', 'plan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};

