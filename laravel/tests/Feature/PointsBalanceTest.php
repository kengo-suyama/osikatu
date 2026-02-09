<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\PointsTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PointsBalanceTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'BalUser',
            'initial' => 'B',
        ]);
    }

    public function test_balance_returns_zero_for_new_user(): void
    {
        $profile = $this->createProfile('dev-bal-001');

        $res = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/points');

        $res->assertStatus(200)
            ->assertJsonPath('success.data.balance', 0)
            ->assertJsonPath('success.data.items', []);
    }

    public function test_balance_reflects_transactions(): void
    {
        $profile = $this->createProfile('dev-bal-002');

        PointsTransaction::create([
            'user_id' => $profile->user_id,
            'circle_id' => null,
            'delta' => 50,
            'reason' => 'invite_reward_inviter',
        ]);

        PointsTransaction::create([
            'user_id' => $profile->user_id,
            'circle_id' => null,
            'delta' => 5,
            'reason' => 'share_copy',
        ]);

        $res = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/points');

        $res->assertStatus(200)
            ->assertJsonPath('success.data.balance', 55);

        $items = $res->json('success.data.items');
        $this->assertCount(2, $items);
    }

    public function test_balance_requires_auth(): void
    {
        $res = $this->getJson('/api/me/points');
        $res->assertStatus(401);
    }
}
