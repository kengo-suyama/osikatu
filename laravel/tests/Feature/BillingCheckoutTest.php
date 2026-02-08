<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use App\Support\BillingCheckoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_returns_url_for_linked_account(): void
    {
        $deviceId = 'device-billing-checkout-001';
        $user = User::factory()->create([
            'email' => 'checkout@example.com',
        ]);

        MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Me',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        $this->app->instance(BillingCheckoutService::class, new class implements BillingCheckoutService {
            public function createCheckoutUrl(User $user, string $deviceId): string
            {
                return 'https://stripe.test/checkout/session_123';
            }
        });

        $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->postJson('/api/billing/checkout')
            ->assertStatus(200)
            ->assertJsonPath('success.data.url', 'https://stripe.test/checkout/session_123');
    }

    public function test_checkout_requires_non_guest_account(): void
    {
        $deviceId = 'device-billing-checkout-guest-001';

        // No explicit user/me_profile; guest device identity is created by MeProfileResolver.
        $this->withHeaders([
            'X-Device-Id' => $deviceId,
        ])->postJson('/api/billing/checkout')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'AUTH_REQUIRED');
    }
}
