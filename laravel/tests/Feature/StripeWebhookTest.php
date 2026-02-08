<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\WebhookEventReceipt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class StripeWebhookTest extends TestCase
{
    use RefreshDatabase;

    private function makePayload(string $eventId, string $type = 'checkout.session.completed'): array
    {
        return [
            'id' => $eventId,
            'type' => $type,
            'data' => ['object' => ['id' => 'cs_test_123']],
        ];
    }

    private function signPayload(string $payload, string $secret): string
    {
        $timestamp = (string) time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);

        return "t={$timestamp},v1={$signature}";
    }

    public function test_webhook_processes_valid_event(): void
    {
        $payload = $this->makePayload('evt_test_001');

        $response = $this->postJson('/api/billing/webhook', $payload);

        $response->assertStatus(200);
        $response->assertJsonPath('success.data.status', 'processed');

        $this->assertDatabaseHas('webhook_event_receipts', [
            'stripe_event_id' => 'evt_test_001',
            'event_type' => 'checkout.session.completed',
        ]);
    }

    public function test_duplicate_event_is_skipped(): void
    {
        WebhookEventReceipt::create([
            'stripe_event_id' => 'evt_dup_001',
            'event_type' => 'checkout.session.completed',
            'status' => 'processed',
        ]);

        $payload = $this->makePayload('evt_dup_001');

        $response = $this->postJson('/api/billing/webhook', $payload);

        $response->assertStatus(200);
        $response->assertJsonPath('success.data.status', 'already_processed');

        $this->assertDatabaseCount('webhook_event_receipts', 1);
    }

    public function test_missing_event_id_returns_400(): void
    {
        $response = $this->postJson('/api/billing/webhook', [
            'type' => 'checkout.session.completed',
        ]);

        $response->assertStatus(400);
        $response->assertJsonPath('error.code', 'MISSING_EVENT_ID');
    }

    public function test_invalid_signature_returns_400(): void
    {
        config(['services.stripe.webhook_secret' => 'whsec_test_secret']);

        Log::spy();

        $payload = $this->makePayload('evt_sig_001');

        $response = $this->withHeaders([
            'Stripe-Signature' => 't=999,v1=invalid_signature',
        ])->postJson('/api/billing/webhook', $payload);

        $response->assertStatus(400);
        $response->assertJsonPath('error.code', 'INVALID_SIGNATURE');

        Log::shouldHaveReceived('warning')
            ->withArgs(function ($message, $context = []) {
                if (!is_string($message)) {
                    return false;
                }
                if (!str_contains($message, 'billing_webhook_invalid_signature')) {
                    return false;
                }
                return is_array($context);
            })
            ->once();
    }

    public function test_valid_signature_passes(): void
    {
        $secret = 'whsec_test_valid_secret';
        config(['services.stripe.webhook_secret' => $secret]);

        $payload = json_encode($this->makePayload('evt_sig_valid'));
        $sigHeader = $this->signPayload($payload, $secret);

        $response = $this->call(
            'POST',
            '/api/billing/webhook',
            [],
            [],
            [],
            ['HTTP_Stripe-Signature' => $sigHeader, 'CONTENT_TYPE' => 'application/json'],
            $payload
        );

        $response->assertStatus(200);
        $response->assertJsonPath('success.data.status', 'processed');
    }
}
