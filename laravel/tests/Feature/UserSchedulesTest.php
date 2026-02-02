<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use App\Models\UserSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserSchedulesTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId)
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Schedule',
            'initial' => 'S',
        ]);
    }

    public function test_can_crud_schedules(): void
    {
        $profile = $this->createProfile('device-schedule-001');

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/schedules');
        $response->assertStatus(200)
            ->assertJsonCount(0, 'success.data.items');

        $create = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->postJson('/api/me/schedules', [
                'title' => 'ミーティング',
                'startAt' => '2026-02-01T10:00:00+09:00',
                'endAt' => '2026-02-01T11:00:00+09:00',
                'isAllDay' => false,
            ]);

        $create->assertStatus(201)
            ->assertJsonPath('success.data.title', 'ミーティング');

        $scheduleId = $create->json('success.data.id');

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->putJson("/api/me/schedules/{$scheduleId}", [
                'title' => '更新ミーティング',
                'startAt' => '2026-02-01T12:00:00+09:00',
                'isAllDay' => true,
            ])
            ->assertStatus(200)
            ->assertJsonPath('success.data.title', '更新ミーティング');

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->deleteJson("/api/me/schedules/{$scheduleId}")
            ->assertStatus(200)
            ->assertJsonPath('success.data.deleted', true);

        $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/schedules')
            ->assertJsonCount(0, 'success.data.items');
    }

    public function test_other_user_cannot_modify(): void
    {
        $profileA = $this->createProfile('device-schedule-002');
        $profileB = $this->createProfile('device-schedule-003');

        $create = $this->withHeaders(['X-Device-Id' => $profileA->device_id])
            ->postJson('/api/me/schedules', [
                'title' => '予定',
                'startAt' => '2026-02-01T10:00:00+09:00',
            ]);

        $create->assertStatus(201);
        $scheduleId = $create->json('success.data.id');

        $this->withHeaders(['X-Device-Id' => $profileB->device_id])
            ->putJson("/api/me/schedules/{$scheduleId}", [
                'title' => '改ざん',
                'startAt' => '2026-02-01T10:00:00+09:00',
            ])->assertStatus(404);

        $this->withHeaders(['X-Device-Id' => $profileB->device_id])
            ->deleteJson("/api/me/schedules/{$scheduleId}")
            ->assertStatus(404);
    }
}
