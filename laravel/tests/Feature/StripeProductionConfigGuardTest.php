<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class StripeProductionConfigGuardTest extends TestCase
{
    public function test_health_ready_fails_when_stripe_secret_missing_in_production(): void
    {
        app()['env'] = 'production';
        config([
            'billing.stripe_secret_key' => '',
            'services.stripe.webhook_secret' => '',
            'billing.price_plus' => '',
            'billing.success_url' => '',
            'billing.cancel_url' => '',
        ]);

        $response = $this->getJson('/api/health/ready');

        $response->assertStatus(503);

        $data = $response->json('success.data');
        $this->assertFalse($data['ok']);

        $codes = array_column($data['errors'], 'code');
        $this->assertContains('STRIPE_SECRET_KEY_MISSING', $codes);
        $this->assertContains('STRIPE_WEBHOOK_SECRET_MISSING', $codes);
        $this->assertContains('STRIPE_PRICE_PLUS_MISSING', $codes);
        $this->assertContains('BILLING_SUCCESS_URL_MISSING', $codes);
        $this->assertContains('BILLING_CANCEL_URL_MISSING', $codes);
    }

    public function test_health_ready_ok_when_all_stripe_envs_set_in_production(): void
    {
        app()['env'] = 'production';
        config([
            'billing.stripe_secret_key' => 'sk_test_fake',
            'services.stripe.webhook_secret' => 'whsec_test_fake',
            'billing.price_plus' => 'price_test_fake',
            'billing.success_url' => 'https://example.com/success',
            'billing.cancel_url' => 'https://example.com/cancel',
            'queue.default' => 'database',
        ]);

        $response = $this->getJson('/api/health/ready');

        $data = $response->json('success.data');
        $this->assertTrue($data['ok']);
        $this->assertEmpty($data['errors']);
    }

    public function test_webhook_rejects_unsigned_in_production(): void
    {
        app()['env'] = 'production';
        config(['services.stripe.webhook_secret' => '']);

        $response = $this->postJson('/api/billing/webhook', [
            'id' => 'evt_test_unsigned',
            'type' => 'checkout.session.completed',
            'data' => ['object' => []],
        ]);

        $response->assertStatus(500);
        $this->assertTrue(
            str_contains($response->getContent(), 'WEBHOOK_SECRET_MISSING'),
            'Expected WEBHOOK_SECRET_MISSING in response'
        );
    }
}
