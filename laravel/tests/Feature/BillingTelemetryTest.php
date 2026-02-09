<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class BillingTelemetryTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_emits_structured_logs(): void
    {
        Log::spy();

        config(['services.stripe.webhook_secret' => '']);

        $payload = [
            'id' => 'evt_telemetry_001',
            'type' => 'checkout.session.completed',
            'data' => ['object' => ['id' => 'cs_test_123']],
        ];

        $this->postJson('/api/billing/webhook', $payload)
            ->assertStatus(200)
            ->assertJsonPath('success.data.status', 'processed');

        Log::shouldHaveReceived('warning')
            ->withArgs(function ($message, $context = []) {
                if ($message !== 'billing_webhook_no_signature_verification') {
                    return false;
                }
                if (!is_array($context)) {
                    return false;
                }
                return ($context['result'] ?? null) === 'unsigned'
                    && ($context['http_status'] ?? null) === 200;
            })
            ->once();

        Log::shouldHaveReceived('info')
            ->withArgs(function ($message, $context = []) {
                if ($message !== 'billing_webhook_verified') {
                    return false;
                }
                if (!is_array($context)) {
                    return false;
                }
                return ($context['result'] ?? null) === 'success'
                    && ($context['reason'] ?? null) === 'unsigned_accepted'
                    && ($context['http_status'] ?? null) === 200;
            })
            ->once();

        Log::shouldHaveReceived('info')
            ->withArgs(function ($message, $context = []) {
                if ($message !== 'billing_webhook_received') {
                    return false;
                }
                if (!is_array($context)) {
                    return false;
                }
                return ($context['stripe_event_id'] ?? null) === 'evt_telemetry_001'
                    && ($context['event_type'] ?? null) === 'checkout.session.completed'
                    && ($context['result'] ?? null) === 'received'
                    && ($context['http_status'] ?? null) === 200;
            })
            ->once();

        Log::shouldHaveReceived('info')
            ->withArgs(function ($message, $context = []) {
                if ($message !== 'billing_webhook_job_dispatched') {
                    return false;
                }
                if (!is_array($context)) {
                    return false;
                }
                return ($context['stripe_event_id'] ?? null) === 'evt_telemetry_001'
                    && ($context['event_type'] ?? null) === 'checkout.session.completed'
                    && ($context['job'] ?? null) === \App\Jobs\ProcessStripeWebhookJob::class
                    && ($context['queue'] ?? null) === 'sync'
                    && ($context['result'] ?? null) === 'dispatched'
                    && ($context['http_status'] ?? null) === 200;
            })
            ->once();
    }
}
