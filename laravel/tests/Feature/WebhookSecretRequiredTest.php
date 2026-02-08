<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookSecretRequiredTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_rejects_when_secret_missing_in_production(): void
    {
        // Simulate production environment without secret
        app()->detectEnvironment(fn () => 'production');
        config(['services.stripe.webhook_secret' => null]);

        $response = $this->postJson('/api/billing/webhook', [
            'id' => 'evt_test_001',
            'type' => 'checkout.session.completed',
            'data' => ['object' => []],
        ]);

        $response->assertStatus(500);
        $response->assertJsonPath('error.code', 'WEBHOOK_SECRET_MISSING');
    }

    public function test_webhook_allows_unsigned_in_local(): void
    {
        // Simulate local environment without secret
        app()->detectEnvironment(fn () => 'local');
        config(['services.stripe.webhook_secret' => null]);

        $response = $this->postJson('/api/billing/webhook', [
            'id' => 'evt_test_002',
            'type' => 'customer.subscription.created',
            'data' => ['object' => ['id' => 'sub_test', 'customer' => 'cus_test', 'status' => 'active']],
        ]);

        // Should not be 500 (secret missing)
        $this->assertNotEquals(500, $response->getStatusCode());
    }
}
