<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CircleSchedulesTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithMember(string $deviceId, string $role = 'member', string $plan = 'free'): array
    {
        $user = User::factory()->create();
        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Member',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => '共有カレンダー',
            'description' => 'テスト',
            'oshi_label' => '推し',
            'oshi_tag' => 'test',
            'oshi_tags' => ['test'],
            'is_public' => true,
            'plan' => $plan,
            'plan_required' => 'free',
            'join_policy' => 'request',
            'max_members' => 30,
            'created_by' => $user->id,
        ]);

        $member = CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => $role,
            'joined_at' => now(),
        ]);

        return [$circle, $member, $profile, $user];
    }

    private function createPayload(): array
    {
        return [
            'title' => 'オフ会',
            'startAt' => '2026-02-02T10:00:00+09:00',
            'endAt' => '2026-02-02T12:00:00+09:00',
            'isAllDay' => false,
            'note' => '持ち物メモ',
            'location' => '渋谷',
        ];
    }

    public function test_member_can_list(): void
    {
        [$circle] = $this->createCircleWithMember('device-calendar-001', 'member', 'free');

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-calendar-001',
        ])->getJson("/api/circles/{$circle->id}/calendar?from=2026-02-01&to=2026-02-28");

        $response->assertStatus(200)
            ->assertJsonPath('success.data.items', []);
    }

    public function test_member_cannot_post_even_on_premium(): void
    {
        [$circle] = $this->createCircleWithMember('device-calendar-002', 'member', 'premium');

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-calendar-002',
        ])->postJson("/api/circles/{$circle->id}/calendar", $this->createPayload());

        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_owner_cannot_post_on_free_plan(): void
    {
        [$circle] = $this->createCircleWithMember('device-calendar-003', 'owner', 'free');

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-calendar-003',
        ])->postJson("/api/circles/{$circle->id}/calendar", $this->createPayload());

        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_owner_can_crud_on_premium(): void
    {
        [$circle] = $this->createCircleWithMember('device-calendar-004', 'owner', 'premium');

        $create = $this->withHeaders([
            'X-Device-Id' => 'device-calendar-004',
        ])->postJson("/api/circles/{$circle->id}/calendar", $this->createPayload());

        $create->assertStatus(201)
            ->assertJsonPath('success.data.id', fn($value) => str_starts_with((string) $value, 'cs_'));

        $id = $create->json('success.data.id');

        $detail = $this->withHeaders([
            'X-Device-Id' => 'device-calendar-004',
        ])->getJson("/api/circles/{$circle->id}/calendar/{$id}");

        $detail->assertStatus(200)
            ->assertJsonPath('success.data.id', $id);

        $update = $this->withHeaders([
            'X-Device-Id' => 'device-calendar-004',
        ])->putJson("/api/circles/{$circle->id}/calendar/{$id}", [
            'title' => 'オフ会(変更)',
            'startAt' => '2026-02-02T10:30:00+09:00',
            'endAt' => '2026-02-02T12:30:00+09:00',
            'isAllDay' => false,
            'note' => '変更後',
            'location' => '新宿',
        ]);

        $update->assertStatus(200)
            ->assertJsonPath('success.data.title', 'オフ会(変更)');

        $delete = $this->withHeaders([
            'X-Device-Id' => 'device-calendar-004',
        ])->deleteJson("/api/circles/{$circle->id}/calendar/{$id}");

        $delete->assertStatus(200)
            ->assertJsonPath('success.data.deleted', true);
    }

    public function test_non_member_is_not_found(): void
    {
        [$circle] = $this->createCircleWithMember('device-calendar-005', 'member', 'free');

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-other-005',
        ])->getJson("/api/circles/{$circle->id}/calendar");

        $response->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
