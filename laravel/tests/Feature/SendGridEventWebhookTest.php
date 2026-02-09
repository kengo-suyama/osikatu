<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\SendGridEventReceipt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SendGridEventWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_stores_events_with_valid_token(): void
    {
        config(['services.sendgrid.event_webhook_token' => 'test-token']);

        $payload = [
            [
                'event' => 'bounce',
                'email' => 'bad@example.com',
                'timestamp' => 1700000000,
                'sg_event_id' => 12345,
            ],
            [
                'event' => 'delivered',
                'email' => 'good@example.com',
                'timestamp' => 1700000001,
            ],
        ];

        $response = $this->postJson('/api/webhooks/sendgrid/events', $payload, [
            'Authorization' => 'Bearer test-token',
        ]);

        $response->assertOk();
        $this->assertEquals(2, $response->json('stored'));
        $this->assertDatabaseCount('sendgrid_event_receipts', 2);
        $this->assertDatabaseHas('sendgrid_event_receipts', [
            'event_type' => 'bounce',
            'email' => 'bad@example.com',
        ]);
    }

    public function test_rejects_invalid_token(): void
    {
        config(['services.sendgrid.event_webhook_token' => 'correct-token']);

        $response = $this->postJson('/api/webhooks/sendgrid/events', [
            ['event' => 'bounce', 'email' => 'x@x.com'],
        ], [
            'Authorization' => 'Bearer wrong-token',
        ]);

        $response->assertStatus(401);
        $this->assertDatabaseCount('sendgrid_event_receipts', 0);
    }

    public function test_returns_503_when_token_missing_in_production(): void
    {
        app()->detectEnvironment(fn() => 'production');
        config(['services.sendgrid.event_webhook_token' => null]);

        $response = $this->postJson('/api/webhooks/sendgrid/events', [
            ['event' => 'bounce', 'email' => 'x@x.com'],
        ]);

        $response->assertStatus(503);
    }

    public function test_allows_without_token_in_local(): void
    {
        config(['services.sendgrid.event_webhook_token' => null]);

        $response = $this->postJson('/api/webhooks/sendgrid/events', [
            ['event' => 'open', 'email' => 'user@example.com', 'timestamp' => 1700000000],
        ]);

        $response->assertOk();
        $this->assertDatabaseCount('sendgrid_event_receipts', 1);
    }
}
