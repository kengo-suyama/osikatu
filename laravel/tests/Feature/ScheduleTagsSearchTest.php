<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use App\Models\UserSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleTagsSearchTest extends TestCase
{
    use RefreshDatabase;

    private function seedUser(): array
    {
        $user = User::factory()->create();
        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'device-sched-test',
            'nickname' => 'Tester',
        ]);
        return [$user];
    }

    public function test_create_schedule_with_tags(): void
    {
        $this->seedUser();
        $response = $this->postJson('/api/me/schedules', [
            'title' => 'Live event',
            'startAt' => '2026-03-01T10:00:00Z',
            'tags' => ['ライブ', '遠征'],
        ], ['X-Device-Id' => 'device-sched-test']);

        $response->assertStatus(201);
        $this->assertEquals(['ライブ', '遠征'], $response->json('success.data.tags'));
    }

    public function test_search_by_title(): void
    {
        [$user] = $this->seedUser();
        UserSchedule::create(['user_id' => $user->id, 'title' => 'ライブ配信', 'start_at' => '2026-03-01 10:00:00']);
        UserSchedule::create(['user_id' => $user->id, 'title' => '通院', 'start_at' => '2026-03-02 14:00:00']);

        $response = $this->getJson('/api/me/schedules?q=ライブ', ['X-Device-Id' => 'device-sched-test']);
        $response->assertStatus(200);
        $items = $response->json('success.data.items');
        $this->assertCount(1, $items);
        $this->assertEquals('ライブ配信', $items[0]['title']);
    }
}
