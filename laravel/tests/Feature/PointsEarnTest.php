<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\PointsTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PointsEarnTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Earn',
            'initial' => 'E',
        ]);
    }

    public function test_share_copy_earns_points_and_rate_limits(): void
    {
        $profile = $this->createProfile('device-earn-001');

        // 5 allowed per minute
        for ($i = 0; $i < 5; $i++) {
            $res = $this->withHeaders(['X-Device-Id' => $profile->device_id])
                ->postJson('/api/me/points/earn', ['reason' => 'share_copy']);
            $res->assertStatus(200)
                ->assertJsonPath('success.data.earned', true)
                ->assertJsonPath('success.data.delta', 5);
        }

        $limited = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/points/earn', ['reason' => 'share_copy']);

        $limited->assertStatus(429)
            ->assertJsonPath('error.code', 'RATE_LIMITED');
    }

    public function test_daily_login_is_once_per_day(): void
    {
        $profile = $this->createProfile('device-earn-002');

        $first = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/points/earn', ['reason' => 'daily_login']);

        $first->assertStatus(200)
            ->assertJsonPath('success.data.earned', true)
            ->assertJsonPath('success.data.delta', 3);

        $second = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/points/earn', ['reason' => 'daily_login']);

        $second->assertStatus(200)
            ->assertJsonPath('success.data.earned', false)
            ->assertJsonPath('success.data.delta', 0);

        $this->assertSame(
            1,
            PointsTransaction::query()
                ->where('user_id', $profile->user_id)
                ->whereNull('circle_id')
                ->where('reason', 'daily_login')
                ->count()
        );
    }
}

