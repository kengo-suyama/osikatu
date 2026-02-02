<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Good;
use App\Models\MeProfile;
use App\Models\Oshi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoodTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Good',
            'initial' => 'G',
        ]);
    }

    public function test_can_create_good(): void
    {
        $profile = $this->createProfile('device-good-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Test Oshi',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/goods', [
                'oshiId' => $oshi->id,
                'name' => 'アクリルスタンド',
                'category' => 'グッズ',
                'purchaseDate' => '2026-02-01',
                'price' => 1800,
                'memo' => '現場で購入',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success.data.name', 'アクリルスタンド')
            ->assertJsonPath('success.data.price', 1800);

        $this->assertDatabaseCount(Good::class, 1);
    }
}
