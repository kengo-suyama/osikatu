<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FortuneTest extends TestCase
{
    use RefreshDatabase;

    private function createDevice(string $deviceId): User
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

    public function test_today_is_stable_and_returns_data(): void
    {
        $this->createDevice('device-fortune-001');
        $response = $this->withHeaders([
            'X-Device-Id' => 'device-fortune-001',
        ])->getJson('/api/me/fortune/today?date=2026-02-01');

        $response->assertStatus(200)
            ->assertJsonPath('success.data.date', '2026-02-01')
            ->assertJsonStructure(['success' => ['data' => ['date', 'luckScore', 'luckyColor', 'luckyItem', 'message', 'goodAction', 'badAction', 'updatedAt']]]);

        $first = $response->json('success.data');
        $second = $this->withHeaders([
            'X-Device-Id' => 'device-fortune-001',
        ])->getJson('/api/me/fortune/today?date=2026-02-01');

        $this->assertEquals($first, $second->json('success.data'));
    }

    public function test_invalid_date_fails(): void
    {
        $this->createDevice('device-fortune-002');
        $this->withHeaders([
            'X-Device-Id' => 'device-fortune-002',
        ])->getJson('/api/me/fortune/today?date=invalid')->assertStatus(422);
    }
}
