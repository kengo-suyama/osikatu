<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\DailyFortune;
use App\Models\MeProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FortuneHistoryTest extends TestCase
{
    use RefreshDatabase;

    private function makeDevice(string $deviceId): User
    {
        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => $deviceId,
            'user_id' => $user->id,
            'nickname' => 'Fortune',
            'initial' => 'F',
        ]);
        return $user;
    }

    public function test_history_returns_existing_records(): void
    {
        $now = Carbon::create(2026, 2, 1, 12, 0, 0, 'Asia/Tokyo');
        Carbon::setTestNow($now);
        $user = $this->makeDevice('device-hist-001');
        $dates = collect(range(0, 6))->map(fn ($offset) => now('Asia/Tokyo')->subDays($offset));
        foreach ($dates as $date) {
            DailyFortune::create([
                'user_id' => $user->id,
                'fortune_date' => $date->toDateString(),
                'luck_score' => $date->day,
                'lucky_color' => 'blue',
                'lucky_item' => 'pen',
                'message' => 'message',
                'good_action' => 'good',
                'bad_action' => 'bad',
            ]);
        }

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-hist-001',
        ])->getJson('/api/me/fortune/history');

        $response->assertStatus(200);
        $items = $response->json('success.data.items');
        $this->assertIsArray($items);
        $this->assertCount(7, $items);
        $this->assertTrue($items[0]['date'] > $items[1]['date']);
        Carbon::setTestNow();
    }

    public function test_invalid_range_returns_validation_error(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 2, 1, 12, 0, 0, 'Asia/Tokyo'));
        $this->makeDevice('device-hist-002');
        $this->withHeaders([
            'X-Device-Id' => 'device-hist-002',
        ])->getJson('/api/me/fortune/history?from=2026-02-10&to=2026-02-01')
          ->assertStatus(422)
          ->assertJsonPath('error.code', 'VALIDATION_ERROR');
        Carbon::setTestNow();
    }

    public function test_history_range_filters_and_orders_desc(): void
    {
        $now = Carbon::create(2026, 2, 1, 12, 0, 0, 'Asia/Tokyo');
        Carbon::setTestNow($now);
        $user = $this->makeDevice('device-hist-003');
        $base = Carbon::create(2026, 2, 1, 0, 0, 0, 'Asia/Tokyo');
        foreach ([0, 1, 2, 3, 4] as $offset) {
            $date = $base->copy()->subDays($offset);
            DailyFortune::create([
                'user_id' => $user->id,
                'fortune_date' => $date->toDateString(),
                'luck_score' => $date->day,
                'lucky_color' => 'blue',
                'lucky_item' => 'pen',
                'message' => 'message',
                'good_action' => 'good',
                'bad_action' => 'bad',
            ]);
        }

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-hist-003',
        ])->getJson('/api/me/fortune/history?from=2026-01-30&to=2026-02-01');

        $response->assertStatus(200);
        $items = $response->json('success.data.items');
        $this->assertCount(3, $items);
        $this->assertSame('2026-02-01', $items[0]['date']);
        $this->assertSame('2026-01-31', $items[1]['date']);
        $this->assertSame('2026-01-30', $items[2]['date']);
        Carbon::setTestNow();
    }
}
