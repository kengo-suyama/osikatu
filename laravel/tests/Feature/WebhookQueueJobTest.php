<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\ProcessStripeWebhookJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WebhookQueueJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_dispatches_job(): void
    {
        Queue::fake();

        config(['services.stripe.webhook_secret' => null]);
        app()->detectEnvironment(fn () => 'local');

        $this->postJson('/api/billing/webhook', [
            'id' => 'evt_queue_test_001',
            'type' => 'customer.subscription.created',
            'data' => [
                'object' => [
                    'id' => 'sub_test_queue',
                    'customer' => 'cus_test',
                    'status' => 'active',
                ],
            ],
        ]);

        Queue::assertPushed(ProcessStripeWebhookJob::class, function ($job) {
            return $job->eventId === 'evt_queue_test_001'
                && $job->eventType === 'customer.subscription.created';
        });
    }

    public function test_job_processes_subscription(): void
    {
        $user = \App\Models\User::factory()->create(['plan' => 'free']);

        $job = new ProcessStripeWebhookJob(
            'evt_job_test_001',
            'customer.subscription.created',
            [
                'id' => 'sub_job_test',
                'customer' => 'cus_job_test',
                'status' => 'active',
                'metadata' => ['user_id' => (string) $user->id],
                'cancel_at_period_end' => false,
            ],
        );

        $job->handle();

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'stripe_subscription_id' => 'sub_job_test',
            'status' => 'active',
        ]);
    }
}
