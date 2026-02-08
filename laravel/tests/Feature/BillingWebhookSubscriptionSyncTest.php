<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingSubscription;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingWebhookSubscriptionSyncTest extends TestCase
{
    use RefreshDatabase;

    private function signPayload(string $payload, string $secret): string
    {
        $timestamp = (string) time();
        $signature = hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);

        return "t={$timestamp},v1={$signature}";
    }

    public function test_subscription_created_upserts_subscription_row(): void
    {
        $secret = 'whsec_test_sub_secret';
        config(['services.stripe.webhook_secret' => $secret]);

        $deviceId = 'device-webhook-sub-001';
        $user = User::factory()->create([
            'email' => 'subsync@example.com',
        ]);

        MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Me',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        $payload = json_encode([
            'id' => 'evt_sub_001',
            'type' => 'customer.subscription.created',
            'data' => [
                'object' => [
                    'id' => 'sub_test_001',
                    'customer' => 'cus_test_001',
                    'status' => 'active',
                    'cancel_at_period_end' => false,
                    'current_period_end' => time() + 3600,
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'device_id' => $deviceId,
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $sigHeader = $this->signPayload((string) $payload, $secret);

        $res = $this->call(
            'POST',
            '/api/billing/webhook',
            [],
            [],
            [],
            ['HTTP_Stripe-Signature' => $sigHeader, 'CONTENT_TYPE' => 'application/json'],
            (string) $payload
        );

        $res->assertStatus(200);
        $res->assertJsonPath('success.data.status', 'processed');

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'plan' => 'plus',
            'stripe_customer_id' => 'cus_test_001',
            'stripe_subscription_id' => 'sub_test_001',
            'status' => 'active',
        ]);
    }

    public function test_subscription_deleted_updates_status(): void
    {
        $secret = 'whsec_test_sub_secret2';
        config(['services.stripe.webhook_secret' => $secret]);

        $deviceId = 'device-webhook-sub-002';
        $user = User::factory()->create([
            'email' => 'subdelete@example.com',
        ]);

        MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Me',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        BillingSubscription::create([
            'user_id' => $user->id,
            'plan' => 'plus',
            'status' => 'active',
            'stripe_customer_id' => 'cus_test_002',
            'stripe_subscription_id' => 'sub_test_002',
            'cancel_at_period_end' => false,
        ]);

        $payload = json_encode([
            'id' => 'evt_sub_002',
            'type' => 'customer.subscription.deleted',
            'data' => [
                'object' => [
                    'id' => 'sub_test_002',
                    'customer' => 'cus_test_002',
                    'status' => 'canceled',
                    'cancel_at_period_end' => false,
                    'current_period_end' => time() + 1,
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'device_id' => $deviceId,
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $sigHeader = $this->signPayload((string) $payload, $secret);

        $res = $this->call(
            'POST',
            '/api/billing/webhook',
            [],
            [],
            [],
            ['HTTP_Stripe-Signature' => $sigHeader, 'CONTENT_TYPE' => 'application/json'],
            (string) $payload
        );

        $res->assertStatus(200);

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'stripe_subscription_id' => 'sub_test_002',
            'status' => 'canceled',
        ]);
    }
}

