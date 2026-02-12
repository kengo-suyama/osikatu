<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleGachaDraw;
use App\Models\CirclePointsBalance;
use App\Models\CirclePointsLedger;
use App\Models\MeProfile;
use App\Models\OperationLog;
use App\Models\User;
use App\Models\UserUnlock;
use App\Services\CirclePointsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CircleGachaDrawTest extends TestCase
{
    use RefreshDatabase;

    private function setup_circle_member(string $deviceId): array
    {
        $user = User::factory()->create();
        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Test',
            'initial' => 'T',
            'user_id' => $user->id,
        ]);
        $circle = Circle::factory()->create();
        CircleMember::create([
            'circle_id' => $circle->id,
            'me_profile_id' => $profile->id,
            'user_id' => $user->id,
            'role' => 'member',
            'joined_at' => now(),
        ]);
        return [$user, $circle, $profile];
    }

    public function test_draw_insufficient_returns_409(): void
    {
        config([
            'gacha.circle_cost' => 100,
            'gacha.circle_pools.global' => [
                ['itemType' => 'frame', 'itemKey' => 'frame_pop_01', 'rarity' => 'R', 'weight' => 1],
            ],
        ]);

        [$user, $circle] = $this->setup_circle_member('dev-cg-001');

        // Seed 50 points (not enough)
        CirclePointsService::add($circle->id, $user->id, 50, 'seed');

        $res = $this->withHeaders(['X-Device-Id' => 'dev-cg-001'])
            ->postJson("/api/circles/{$circle->id}/gacha/draw");

        $res->assertStatus(409)
            ->assertJsonPath('error.code', 'INSUFFICIENT_CIRCLE_POINTS')
            ->assertJsonPath('error.details.balance', 50)
            ->assertJsonPath('error.details.required', 100);
    }

    public function test_draw_success_deducts_awards_logs(): void
    {
        config([
            'gacha.circle_cost' => 100,
            'gacha.circle_pools.global' => [
                ['itemType' => 'frame', 'itemKey' => 'frame_pop_01', 'rarity' => 'R', 'weight' => 1],
            ],
        ]);

        [$user, $circle] = $this->setup_circle_member('dev-cg-002');

        // Seed 200 points
        CirclePointsService::add($circle->id, $user->id, 200, 'seed');

        $res = $this->withHeaders(['X-Device-Id' => 'dev-cg-002'])
            ->postJson("/api/circles/{$circle->id}/gacha/draw");

        $res->assertStatus(200)
            ->assertJsonPath('success.data.cost', 100)
            ->assertJsonPath('success.data.balance', 100)
            ->assertJsonPath('success.data.prize.itemType', 'frame')
            ->assertJsonPath('success.data.prize.itemKey', 'frame_pop_01')
            ->assertJsonPath('success.data.prize.rarity', 'R')
            ->assertJsonPath('success.data.prize.isNew', true);

        // Ledger has -100 entry
        $this->assertSame(1, CirclePointsLedger::query()
            ->where('circle_id', $circle->id)
            ->where('reason', 'circle_gacha_draw')
            ->where('delta', -100)
            ->count());

        // Balance updated
        $bal = CirclePointsBalance::query()->find($circle->id);
        $this->assertSame(100, (int) $bal->balance);

        // Draw record saved
        $this->assertSame(1, CircleGachaDraw::query()
            ->where('circle_id', $circle->id)
            ->where('actor_user_id', $user->id)
            ->count());

        // UserUnlock (inventory)
        $this->assertSame(1, UserUnlock::query()
            ->where('user_id', $user->id)
            ->where('item_type', 'frame')
            ->where('item_key', 'frame_pop_01')
            ->count());

        // Operation log
        $this->assertSame(1, OperationLog::query()
            ->where('action', 'circle_gacha_drawn')
            ->where('circle_id', $circle->id)
            ->count());
    }
}
