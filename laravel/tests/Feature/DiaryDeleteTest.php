<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Diary;
use App\Models\MeProfile;
use App\Models\Oshi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiaryDeleteTest extends TestCase
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

    public function test_can_delete_own_diary(): void
    {
        $profile = $this->createProfile('device-diary-del-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Test Oshi',
        ]);
        $diary = Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => '削除対象',
            'content' => 'メモ',
            'diary_date' => '2026-02-01',
            'is_locked' => false,
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->deleteJson("/api/me/diaries/{$diary->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success.data', null);

        $this->assertSoftDeleted('diaries', ['id' => $diary->id]);
    }

    public function test_delete_returns_not_found_for_other_user(): void
    {
        $profileA = $this->createProfile('device-diary-del-002');
        $profileB = $this->createProfile('device-diary-del-003');
        $oshi = Oshi::create([
            'user_id' => $profileA->user_id,
            'name' => 'Other Oshi',
        ]);
        $diary = Diary::create([
            'user_id' => $profileA->user_id,
            'oshi_id' => $oshi->id,
            'title' => '他人の日記',
            'content' => 'メモ',
            'diary_date' => '2026-02-01',
            'is_locked' => false,
        ]);

        $this->withHeaders(['X-Device-Id' => $profileB->device_id])
            ->deleteJson("/api/me/diaries/{$diary->id}")
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');
    }

    public function test_delete_returns_not_found_for_missing_diary(): void
    {
        $profile = $this->createProfile('device-diary-del-004');

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->deleteJson('/api/me/diaries/9999')
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
