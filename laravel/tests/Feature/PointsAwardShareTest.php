<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\PointsTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PointsAwardShareTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'ShareUser',
            'initial' => 'S',
        ]);
    }

    public function test_share_copy_awards_5_points(): void
    {
        $profile = $this->createProfile('device-share-001');

        $res = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/points/earn', ['reason' => 'share_copy']);

        $res->assertStatus(200)
            ->assertJsonPath('success.data.earned', true)
            ->assertJsonPath('success.data.delta', 5)
            ->assertJsonPath('success.data.balance', 5);
    }

    public function test_share_copy_accumulates_balance(): void
    {
        $profile = $this->createProfile('device-share-002');

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/points/earn', ['reason' => 'share_copy']);

        $res = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/points/earn', ['reason' => 'share_copy']);

        $res->assertStatus(200)
            ->assertJsonPath('success.data.balance', 10);
    }

    public function test_share_copy_rate_limited_after_5(): void
    {
        $profile = $this->createProfile('device-share-003');

        for ($i = 0; $i < 5; $i++) {
            $this->withHeaders(['X-Device-Id' => $profile->device_id])
                ->postJson('/api/me/points/earn', ['reason' => 'share_copy'])
                ->assertStatus(200);
        }

        $limited = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/points/earn', ['reason' => 'share_copy']);

        $limited->assertStatus(429)
            ->assertJsonPath('error.code', 'RATE_LIMITED');
    }

    public function test_share_copy_creates_transaction_record(): void
    {
        $profile = $this->createProfile('device-share-004');

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/points/earn', ['reason' => 'share_copy']);

        $tx = PointsTransaction::query()
            ->where('user_id', $profile->user_id)
            ->where('reason', 'share_copy')
            ->first();

        $this->assertNotNull($tx);
        $this->assertSame(5, $tx->delta);
    }
}
