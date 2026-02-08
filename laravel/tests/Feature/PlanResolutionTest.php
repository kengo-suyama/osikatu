<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BillingSubscription;
use App\Models\User;
use App\Support\Entitlements;
use App\Support\SubscriptionResolver;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanResolutionTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_resolves_to_free(): void
    {
        $user = User::factory()->create(['plan' => 'free', 'trial_ends_at' => null]);
        $this->assertEquals('free', SubscriptionResolver::resolve($user));
        $this->assertEquals('free', Entitlements::effectivePlan($user));
    }

    public function test_trial_user_resolves_to_premium(): void
    {
        $user = User::factory()->create([
            'plan' => 'free',
            'trial_ends_at' => Carbon::now()->addDays(7),
        ]);
        $this->assertEquals('premium', SubscriptionResolver::resolve($user));
        $this->assertEquals('premium', Entitlements::effectivePlan($user));
    }

    public function test_stripe_plus_resolves_to_plus(): void
    {
        $user = User::factory()->create(['plan' => 'free']);
        BillingSubscription::create([
            'user_id' => $user->id,
            'stripe_subscription_id' => 'sub_test_001',
            'plan' => 'plus',
            'status' => 'active',
        ]);

        $this->assertEquals('plus', SubscriptionResolver::resolve($user));
        $this->assertEquals('plus', Entitlements::effectivePlan($user));
    }

    public function test_canceled_subscription_falls_back_to_free(): void
    {
        $user = User::factory()->create(['plan' => 'free']);
        BillingSubscription::create([
            'user_id' => $user->id,
            'stripe_subscription_id' => 'sub_test_002',
            'plan' => 'plus',
            'status' => 'canceled',
        ]);

        $this->assertEquals('free', SubscriptionResolver::resolve($user));
    }

    public function test_me_api_returns_resolved_plan(): void
    {
        $user = User::factory()->create(['plan' => 'free']);
        BillingSubscription::create([
            'user_id' => $user->id,
            'stripe_subscription_id' => 'sub_test_003',
            'plan' => 'plus',
            'status' => 'active',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => 'dev-test-plan'])
            ->getJson('/api/me');

        $response->assertStatus(200);
        $data = $response->json('success.data');
        $this->assertEquals('plus', $data['plan']);
        $this->assertEquals('plus', $data['effectivePlan']);
    }
}
