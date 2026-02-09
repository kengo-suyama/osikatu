<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class BillingWebhookSubscriptionSyncTest extends TestCase
{
    use RefreshDatabase;

    private function postEvent(array $payload): void
    {
        // These tests cover DB sync logic; signature verification is covered in StripeWebhookTest.
        config(['services.stripe.webhook_secret' => '']);

        $this->postJson('/api/billing/webhook', $payload)
            ->assertStatus(200)
            ->assertJsonPath('success.data.status', 'processed');
    }

    public function test_subscription_created_upserts_subscription_row(): void
    {
        $user = User::factory()->create([
            'email' => 'billing-sub-created@example.com',
        ]);

        Log::spy();

        $this->postEvent([
            'id' => 'evt_sub_created_001',
            'type' => 'customer.subscription.created',
            'data' => [
                'object' => [
                    'id' => 'sub_123',
                    'customer' => 'cus_123',
                    'status' => 'active',
                    'cancel_at_period_end' => false,
                    'current_period_end' => 1_800_000_000,
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'device_id' => 'device-test-001',
                    ],
                ],
            ],
        ]);

        $sub = BillingSubscription::query()->where('stripe_subscription_id', 'sub_123')->first();
        $this->assertNotNull($sub);
        $this->assertSame($user->id, $sub->user_id);
        $this->assertSame('cus_123', $sub->stripe_customer_id);
        $this->assertSame('plus', $sub->plan);
        $this->assertSame('active', $sub->status);
        $this->assertFalse((bool) $sub->cancel_at_period_end);
        $this->assertNotNull($sub->current_period_end);

        Log::shouldHaveReceived('info')
            ->withArgs(function ($message, $context = []) use ($user) {
                if ($message !== 'billing_subscription_synced') {
                    return false;
                }
                if (!is_array($context)) {
                    return false;
                }
                return ($context['stripe_event_id'] ?? null) === 'evt_sub_created_001'
                    && ($context['event_type'] ?? null) === 'customer.subscription.created'
                    && ($context['user_id'] ?? null) === $user->id
                    && ($context['plan'] ?? null) === 'plus'
                    && ($context['status'] ?? null) === 'active'
                    && ($context['stripe_subscription_id'] ?? null) === 'sub_123'
                    && ($context['result'] ?? null) === 'success';
            })
            ->once();
    }

    public function test_subscription_updated_updates_existing_row(): void
    {
        $user = User::factory()->create([
            'email' => 'billing-sub-updated@example.com',
        ]);

        BillingSubscription::create([
            'user_id' => $user->id,
            'plan' => 'plus',
            'stripe_customer_id' => 'cus_123',
            'stripe_subscription_id' => 'sub_123',
            'status' => 'trialing',
            'cancel_at_period_end' => false,
        ]);

        $this->postEvent([
            'id' => 'evt_sub_updated_001',
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_123',
                    'customer' => 'cus_123',
                    'status' => 'past_due',
                    'cancel_at_period_end' => true,
                    'current_period_end' => 1_900_000_000,
                    'metadata' => [
                        'user_id' => (string) $user->id,
                    ],
                ],
            ],
        ]);

        $sub = BillingSubscription::query()->where('stripe_subscription_id', 'sub_123')->first();
        $this->assertNotNull($sub);
        $this->assertSame($user->id, $sub->user_id);
        $this->assertSame('past_due', $sub->status);
        $this->assertTrue((bool) $sub->cancel_at_period_end);
        $this->assertNotNull($sub->current_period_end);
    }

    public function test_subscription_deleted_updates_status(): void
    {
        $user = User::factory()->create([
            'email' => 'billing-sub-deleted@example.com',
        ]);

        BillingSubscription::create([
            'user_id' => $user->id,
            'plan' => 'plus',
            'stripe_customer_id' => 'cus_123',
            'stripe_subscription_id' => 'sub_123',
            'status' => 'active',
            'cancel_at_period_end' => false,
        ]);

        $this->postEvent([
            'id' => 'evt_sub_deleted_001',
            'type' => 'customer.subscription.deleted',
            'data' => [
                'object' => [
                    'id' => 'sub_123',
                    'customer' => 'cus_123',
                    'status' => 'canceled',
                    'cancel_at_period_end' => false,
                    'metadata' => [
                        'user_id' => (string) $user->id,
                    ],
                ],
            ],
        ]);

        $sub = BillingSubscription::query()->where('stripe_subscription_id', 'sub_123')->first();
        $this->assertNotNull($sub);
        $this->assertSame('canceled', $sub->status);
    }
}
