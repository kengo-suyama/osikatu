<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Diary;
use App\Models\MeProfile;
use App\Models\Oshi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiaryDateRangeFilterTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Tester',
        ]);
    }

    public function test_filter_by_date_range(): void
    {
        $profile = $this->createProfile('device-date-range-001');
        $oshi = Oshi::create([
            'user_id' => $profile->user_id,
            'name' => 'Date Range Oshi',
        ]);

        Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'January entry',
            'content' => 'January',
            'diary_date' => '2026-01-15',
        ]);

        Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'February entry',
            'content' => 'February',
            'diary_date' => '2026-02-05',
        ]);

        Diary::create([
            'user_id' => $profile->user_id,
            'oshi_id' => $oshi->id,
            'title' => 'March entry',
            'content' => 'March',
            'diary_date' => '2026-03-10',
        ]);

        // from=2026-02-01
        $response = $this->getJson('/api/me/diaries?from=2026-02-01', [
            'X-Device-Id' => 'device-date-range-001',
        ]);
        $response->assertStatus(200);
        $data = $response->json('success.data');
        $this->assertCount(2, $data);

        // to=2026-02-28
        $response2 = $this->getJson('/api/me/diaries?to=2026-02-28', [
            'X-Device-Id' => 'device-date-range-001',
        ]);
        $response2->assertStatus(200);
        $data2 = $response2->json('success.data');
        $this->assertCount(2, $data2);

        // from=2026-02-01&to=2026-02-28
        $response3 = $this->getJson('/api/me/diaries?from=2026-02-01&to=2026-02-28', [
            'X-Device-Id' => 'device-date-range-001',
        ]);
        $response3->assertStatus(200);
        $data3 = $response3->json('success.data');
        $this->assertCount(1, $data3);
        $this->assertEquals('February entry', $data3[0]['title']);
    }
}
