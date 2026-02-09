<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GachaLog;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GachaHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_history_returns_logs_newest_first(): void
    {
        $user = User::factory()->create();

        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'dev-gacha-hist-001',
            'nickname' => 'HistTester',
        ]);

        GachaLog::create([
            'user_id' => $user->id,
            'item_type' => 'frame',
            'item_key' => 'polaroid_elegant',
            'rarity' => 'R',
            'is_new' => true,
            'points_cost' => 100,
            'created_at' => now()->subHour(),
        ]);

        GachaLog::create([
            'user_id' => $user->id,
            'item_type' => 'theme',
            'item_key' => 'midnight',
            'rarity' => 'SR',
            'is_new' => false,
            'points_cost' => 100,
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/me/gacha/history', [
            'X-Device-Id' => 'dev-gacha-hist-001',
        ]);

        $response->assertStatus(200);
        $data = $response->json('success.data');

        $this->assertCount(2, $data['items']);
        $this->assertEquals(2, $data['total']);

        // Newest first
        $this->assertEquals('midnight', $data['items'][0]['itemKey']);
        $this->assertEquals('SR', $data['items'][0]['rarity']);
        $this->assertEquals('polaroid_elegant', $data['items'][1]['itemKey']);
    }

    public function test_history_empty_for_no_pulls(): void
    {
        $user = User::factory()->create();

        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'dev-gacha-hist-002',
            'nickname' => 'EmptyTester',
        ]);

        $response = $this->getJson('/api/me/gacha/history', [
            'X-Device-Id' => 'dev-gacha-hist-002',
        ]);

        $response->assertStatus(200);
        $data = $response->json('success.data');

        $this->assertCount(0, $data['items']);
        $this->assertEquals(0, $data['total']);
        $this->assertNull($data['nextCursor']);
    }

    public function test_pull_creates_gacha_log(): void
    {
        config([
            'gacha.cost' => 100,
            'gacha.pools.default' => [
                ['itemType' => 'frame', 'itemKey' => 'frame_test', 'rarity' => 'R', 'weight' => 1],
            ],
        ]);

        $user = User::factory()->create();

        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'dev-gacha-hist-003',
            'nickname' => 'PullLogger',
        ]);

        \App\Services\PointsService::add($user->id, null, 200, 'seed', ['source' => 'test'], 'req-seed', 'seed:200');

        $this->withHeaders(['X-Device-Id' => 'dev-gacha-hist-003'])
            ->postJson('/api/me/gacha/pull');

        $this->assertSame(1, GachaLog::query()->where('user_id', $user->id)->count());

        $log = GachaLog::query()->where('user_id', $user->id)->first();
        $this->assertEquals('frame', $log->item_type);
        $this->assertEquals('frame_test', $log->item_key);
        $this->assertEquals('R', $log->rarity);
        $this->assertTrue($log->is_new);
        $this->assertEquals(100, $log->points_cost);
    }
}
