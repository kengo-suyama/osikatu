<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\PointsTransaction;
use App\Models\User;
use App\Models\UserUnlock;
use App\Services\PointsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GachaPullTest extends TestCase
{
    use RefreshDatabase;

    public function test_pull_deducts_points_and_unlocks_prize(): void
    {
        config([
            'gacha.cost' => 100,
            'gacha.pools.default' => [
                ['itemType' => 'frame', 'itemKey' => 'frame_test', 'rarity' => 'R', 'weight' => 1],
            ],
        ]);

        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-gacha-001',
            'nickname' => 'Gacha',
            'initial' => 'G',
            'user_id' => $user->id,
        ]);

        PointsService::add($user->id, null, 120, 'seed', ['source' => 'test'], 'req-seed', 'seed:120');

        $res = $this->withHeaders(['X-Device-Id' => 'dev-gacha-001'])
            ->postJson('/api/me/gacha/pull');

        $res->assertStatus(200)
            ->assertJsonPath('success.data.cost', 100)
            ->assertJsonPath('success.data.balance', 20)
            ->assertJsonPath('success.data.prize.itemType', 'frame')
            ->assertJsonPath('success.data.prize.itemKey', 'frame_test')
            ->assertJsonPath('success.data.prize.rarity', 'R')
            ->assertJsonPath('success.data.prize.isNew', true);

        $this->assertSame(
            1,
            PointsTransaction::query()
                ->where('user_id', $user->id)
                ->whereNull('circle_id')
                ->where('reason', 'gacha_pull_cost')
                ->count()
        );

        $this->assertSame(
            1,
            UserUnlock::query()
                ->where('user_id', $user->id)
                ->where('item_type', 'frame')
                ->where('item_key', 'frame_test')
                ->count()
        );
    }

    public function test_pull_fails_when_insufficient_points(): void
    {
        config([
            'gacha.cost' => 100,
            'gacha.pools.default' => [
                ['itemType' => 'frame', 'itemKey' => 'frame_test', 'rarity' => 'R', 'weight' => 1],
            ],
        ]);

        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-gacha-002',
            'nickname' => 'Gacha',
            'initial' => 'G',
            'user_id' => $user->id,
        ]);

        PointsService::add($user->id, null, 50, 'seed', ['source' => 'test'], 'req-seed', 'seed:50');

        $res = $this->withHeaders(['X-Device-Id' => 'dev-gacha-002'])
            ->postJson('/api/me/gacha/pull');

        $res->assertStatus(409)
            ->assertJsonPath('error.code', 'POINTS_INSUFFICIENT')
            ->assertJsonPath('error.details.required', 100)
            ->assertJsonPath('error.details.balance', 50);

        $this->assertSame(0, (int) UserUnlock::query()->where('user_id', $user->id)->count());
    }
}

