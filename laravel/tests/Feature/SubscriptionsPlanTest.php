<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingSubscription;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionsPlanTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscription_absent_me_plan_is_free(): void
    {
        $deviceId = 'device-sub-plan-free-001';
        $user = User::factory()->create([
            'plan' => 'free',
        ]);

        MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Me',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        $this->withHeaders(['X-Device-Id' => $deviceId])
            ->getJson('/api/me')
            ->assertStatus(200)
            ->assertJsonPath('success.data.plan', 'free')
            ->assertJsonPath('success.data.effectivePlan', 'free');
    }

    public function test_active_subscription_me_plan_is_plus(): void
    {
        $deviceId = 'device-sub-plan-plus-001';
        $user = User::factory()->create([
            'plan' => 'free',
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
            'stripe_customer_id' => 'cus_test_001',
            'stripe_subscription_id' => 'sub_test_001',
            'current_period_end' => now()->addMonth(),
            'cancel_at_period_end' => false,
        ]);

        $this->withHeaders(['X-Device-Id' => $deviceId])
            ->getJson('/api/me')
            ->assertStatus(200)
            ->assertJsonPath('success.data.plan', 'plus')
            ->assertJsonPath('success.data.effectivePlan', 'plus');
    }
}

