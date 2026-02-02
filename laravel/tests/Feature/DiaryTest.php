<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Diary;
use App\Models\MeProfile;
use App\Models\Oshi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiaryTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Diary',
            'initial' => 'D',
        ]);
    }

    public function test_can_create_diary(): void
    {
        $profile = $this->createProfile('device-diary-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Test Oshi',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/diaries', [
                'oshiId' => $oshi->id,
                'title' => '今日のログ',
                'content' => '最高のライブだった',
                'diaryDate' => '2026-02-01',
                'isLocked' => false,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success.data.title', '今日のログ')
            ->assertJsonPath('success.data.oshiId', $oshi->id);

        $this->assertDatabaseCount(Diary::class, 1);
    }
}
