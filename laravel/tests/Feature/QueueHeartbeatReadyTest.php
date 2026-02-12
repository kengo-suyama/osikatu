<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class QueueHeartbeatReadyTest extends TestCase
{
    public function test_heartbeat_command_updates_cache(): void
    {
        Cache::forget('queue_heartbeat_ts');

        $this->artisan('queue:heartbeat')
            ->assertSuccessful();

        $this->assertNotNull(Cache::get('queue_heartbeat_ts'));
    }

    public function test_ready_warns_when_heartbeat_missing_in_production(): void
    {
        app()->detectEnvironment(fn() => 'production');
        config(['app.env' => 'production']);
        Cache::forget('queue_heartbeat_ts');

        config([
            'billing.stripe_secret_key' => 'sk_live_test',
            'services.stripe.webhook_secret' => 'whsec_test',
            'billing.price_plus' => 'price_test',
            'billing.success_url' => '/billing/complete',
            'billing.cancel_url' => '/pricing',
        ]);

        $response = $this->getJson('/api/health/ready');
        $data = $response->json('success.data');
        $warningCodes = array_column($data['warnings'] ?? [], 'code');
        $this->assertContains('QUEUE_HEARTBEAT_MISSING', $warningCodes);
    }

    public function test_ready_errors_when_heartbeat_stale_in_production(): void
    {
        app()->detectEnvironment(fn() => 'production');
        config(['app.env' => 'production']);
        Cache::put('queue_heartbeat_ts', now()->subMinutes(5)->timestamp, 300);

        config([
            'billing.stripe_secret_key' => 'sk_live_test',
            'services.stripe.webhook_secret' => 'whsec_test',
            'billing.price_plus' => 'price_test',
            'billing.success_url' => '/billing/complete',
            'billing.cancel_url' => '/pricing',
        ]);

        $response = $this->getJson('/api/health/ready');
        $data = $response->json('success.data');
        $errorCodes = array_column($data['errors'] ?? [], 'code');
        $this->assertContains('QUEUE_HEARTBEAT_STALE', $errorCodes);
    }
}
