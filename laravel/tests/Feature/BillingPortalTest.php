<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingSubscription;
use App\Models\MeProfile;
use App\Models\User;
use App\Support\BillingPortalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingPortalTest extends TestCase
{
    use RefreshDatabase;

    public function test_portal_returns_url_for_customer(): void
    {
        $deviceId = 'device-billing-portal-001';
        $user = User::factory()->create([
            'email' => 'portal@example.com',
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
            'stripe_customer_id' => 'cus_test_123',
            'stripe_subscription_id' => 'sub_test_123',
            'status' => 'active',
            'cancel_at_period_end' => false,
        ]);

        $this->app->instance(BillingPortalService::class, new class implements BillingPortalService {
            public function createPortalUrl(string $stripeCustomerId): string
            {
                return 'https://stripe.test/portal/session_123';
            }
        });

        $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->getJson('/api/billing/portal')
            ->assertStatus(200)
            ->assertJsonPath('success.data.url', 'https://stripe.test/portal/session_123');
    }

    public function test_portal_requires_customer_id(): void
    {
        $deviceId = 'device-billing-portal-002';
        $user = User::factory()->create([
            'email' => 'portal2@example.com',
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
            'cancel_at_period_end' => false,
        ]);

        $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->getJson('/api/billing/portal')
            ->assertStatus(400)
            ->assertJsonPath('error.code', 'BILLING_NOT_READY');
    }
}

