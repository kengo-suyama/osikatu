<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\WebhookEventReceipt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingWebhookSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_summary_returns_counts(): void
    {
        WebhookEventReceipt::create([
            'stripe_event_id' => 'evt_success_1',
            'event_type' => 'checkout.session.completed',
            'status' => 'processed',
        ]);

        WebhookEventReceipt::create([
            'stripe_event_id' => 'evt_fail_1',
            'event_type' => 'customer.subscription.updated',
            'status' => 'failed',
        ]);

        $response = $this->getJson('/api/admin/billing/webhook-summary?hours=24');
        $response->assertOk();
        $data = $response->json('success.data');
        $this->assertEquals(2, $data['total']);
        $this->assertEquals(1, $data['success']);
        $this->assertEquals(1, $data['failed']);
        $this->assertEquals(50.0, $data['failureRate']);
        $this->assertCount(1, $data['recentFailures']);
    }

    public function test_webhook_summary_forbidden_in_production(): void
    {
        app()->detectEnvironment(fn() => 'production');
        config(['billing.debug_enabled' => false]);

        $response = $this->getJson('/api/admin/billing/webhook-summary');
        $response->assertStatus(403);
    }
}
