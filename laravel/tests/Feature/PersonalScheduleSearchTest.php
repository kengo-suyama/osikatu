<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use App\Models\UserSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonalScheduleSearchTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Search',
            'initial' => 'S',
        ]);
    }

    public function test_search_filters_by_title(): void
    {
        $profile = $this->createProfile('device-search-001');

        // Create 3 schedules
        UserSchedule::create([
            'user_id' => $profile->user_id,
            'title' => 'ライブ配信',
            'start_at' => '2026-02-10T10:00:00',
            'is_all_day' => false,
        ]);
        UserSchedule::create([
            'user_id' => $profile->user_id,
            'title' => '通院',
            'start_at' => '2026-02-11T14:00:00',
            'is_all_day' => false,
        ]);
        UserSchedule::create([
            'user_id' => $profile->user_id,
            'title' => 'ライブ鑑賞',
            'start_at' => '2026-02-12T18:00:00',
            'is_all_day' => false,
        ]);

        // Search for "ライブ" should return 2
        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/schedules?search=' . urlencode('ライブ'));

        $response->assertStatus(200)
            ->assertJsonCount(2, 'success.data.items');

        $titles = collect($response->json('success.data.items'))->pluck('title')->all();
        $this->assertContains('ライブ配信', $titles);
        $this->assertContains('ライブ鑑賞', $titles);
    }

    public function test_search_returns_empty_when_no_match(): void
    {
        $profile = $this->createProfile('device-search-002');

        UserSchedule::create([
            'user_id' => $profile->user_id,
            'title' => '通院',
            'start_at' => '2026-02-10T10:00:00',
            'is_all_day' => false,
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/schedules?search=' . urlencode('ライブ'));

        $response->assertStatus(200)
            ->assertJsonCount(0, 'success.data.items');
    }

    public function test_search_combines_with_date_filter(): void
    {
        $profile = $this->createProfile('device-search-003');

        UserSchedule::create([
            'user_id' => $profile->user_id,
            'title' => 'ライブ配信',
            'start_at' => '2026-01-15T10:00:00',
            'is_all_day' => false,
        ]);
        UserSchedule::create([
            'user_id' => $profile->user_id,
            'title' => 'ライブ鑑賞',
            'start_at' => '2026-02-15T10:00:00',
            'is_all_day' => false,
        ]);

        // Search for "ライブ" in Feb only
        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/schedules?search=' . urlencode('ライブ') . '&from=2026-02-01&to=2026-02-28');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'success.data.items');

        $this->assertEquals('ライブ鑑賞', $response->json('success.data.items.0.title'));
    }

    public function test_without_search_returns_all(): void
    {
        $profile = $this->createProfile('device-search-004');

        UserSchedule::create([
            'user_id' => $profile->user_id,
            'title' => 'A',
            'start_at' => '2026-02-10T10:00:00',
            'is_all_day' => false,
        ]);
        UserSchedule::create([
            'user_id' => $profile->user_id,
            'title' => 'B',
            'start_at' => '2026-02-11T10:00:00',
            'is_all_day' => false,
        ]);

        $response = $this->withHeaders(['X-Device-Id' => $profile->device_id])
            ->getJson('/api/me/schedules');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'success.data.items');
    }
}
