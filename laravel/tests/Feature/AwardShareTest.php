<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\PointsTransaction;
use App\Models\User;
use App\Services\PointsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AwardShareTest extends TestCase
{
    use RefreshDatabase;

    private function createDevice(string $deviceId): User
    {
        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Share',
            'initial' => 'S',
            'user_id' => $user->id,
        ]);
        return $user;
    }

    public function test_award_share_gives_5_points(): void
    {
        $user = $this->createDevice('dev-share-001');

        $res = $this->withHeaders(['X-Device-Id' => 'dev-share-001'])
            ->postJson('/api/me/points/award-share');

        $res->assertStatus(200)
            ->assertJsonPath('success.data.awarded', true)
            ->assertJsonPath('success.data.delta', 5)
            ->assertJsonPath('success.data.balance', 5);

        $this->assertSame(1, PointsTransaction::query()
            ->where('user_id', $user->id)
            ->where('reason', 'award_share')
            ->count());
    }

    public function test_award_share_second_call_same_day_returns_409(): void
    {
        $user = $this->createDevice('dev-share-002');

        // First call succeeds
        $this->withHeaders(['X-Device-Id' => 'dev-share-002'])
            ->postJson('/api/me/points/award-share')
            ->assertStatus(200);

        // Second call same day returns 409
        $res = $this->withHeaders(['X-Device-Id' => 'dev-share-002'])
            ->postJson('/api/me/points/award-share');

        $res->assertStatus(409)
            ->assertJsonPath('error.code', 'ALREADY_AWARDED_TODAY')
            ->assertJsonPath('error.details.balance', 5);

        // Only 1 transaction created
        $this->assertSame(1, PointsTransaction::query()
            ->where('user_id', $user->id)
            ->where('reason', 'award_share')
            ->count());
    }
}
