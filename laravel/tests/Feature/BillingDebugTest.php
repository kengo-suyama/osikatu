<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingDebugTest extends TestCase
{
    use RefreshDatabase;

    public function test_debug_returns_billing_info_in_local(): void
    {
        $user = User::factory()->create(['plan' => 'plus']);
        MeProfile::create([
            'device_id' => 'device-billing-debug-001',
            'nickname' => 'Debug User',
            'initial' => 'D',
            'user_id' => $user->id,
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-billing-debug-001',
        ])->getJson('/api/billing/debug');

        $response->assertStatus(200);
        $response->assertJsonPath('success.data.plan', 'plus');
        $response->assertJsonPath('success.data.hasPlus', true);
        $response->assertJsonPath('success.data.hasPremium', true);
    }

    public function test_debug_blocked_in_production(): void
    {
        app()->detectEnvironment(fn () => 'production');

        $response = $this->getJson('/api/billing/debug');

        $response->assertStatus(403);
        $response->assertJsonPath('error.code', 'FORBIDDEN');
    }
}
