<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class HealthReadyTest extends TestCase
{
    public function test_ready_returns_not_ok_when_not_production(): void
    {
        $res = $this->getJson('/api/health/ready');

        $res->assertOk()
            ->assertJsonPath('success.data.ok', false)
            ->assertJsonPath('success.data.errors.0.code', 'APP_ENV_NOT_PRODUCTION');
    }

    public function test_ready_returns_ok_when_production_and_required_settings_exist(): void
    {
        config([
            'app.env' => 'production',
            'billing.stripe_secret_key' => 'sk_test_ready_001',
            'services.stripe.webhook_secret' => 'whsec_ready_001',
            'billing.price_plus' => 'price_ready_001',
            'billing.success_url' => 'https://example.com/billing/return?status=success',
            'billing.cancel_url' => 'https://example.com/billing/return?status=cancel',
            'queue.default' => 'database',
        ]);

        $res = $this->getJson('/api/health/ready');

        $res->assertOk()
            ->assertJsonPath('success.data.ok', true)
            ->assertJsonPath('success.data.errors', []);
    }
}

