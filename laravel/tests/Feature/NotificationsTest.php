<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Console\Commands\DispatchScheduleNotifications;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleSchedule;
use App\Models\CircleScheduleParticipant;
use App\Models\MeProfile;
use App\Models\Notification;
use App\Models\User;
use App\Models\UserSchedule;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): array
    {
        $user = User::factory()->create();
        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Member',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        return [$user, $profile];
    }

    public function test_dispatch_creates_notifications_and_read_flow(): void
    {
        $now = Carbon::create(2026, 2, 1, 9, 0, 0, 'Asia/Tokyo');
        Carbon::setTestNow($now);

        [$user, $profile] = $this->createProfile('device-nt-001');
        [$user2, $profile2] = $this->createProfile('device-nt-002');

        UserSchedule::create([
            'user_id' => $user->id,
            'title' => '通院',
            'start_at' => $now->copy()->addMinutes(30),
            'end_at' => $now->copy()->addMinutes(60),
            'is_all_day' => false,
        ]);

        $circle = Circle::create([
            'name' => '共有カレンダー',
            'description' => 'テスト',
            'oshi_label' => '推し',
            'oshi_tag' => 'test',
            'oshi_tags' => ['test'],
            'is_public' => true,
            'plan' => 'premium',
            'plan_required' => 'free',
            'join_policy' => 'request',
            'max_members' => 30,
            'created_by' => $user->id,
        ]);

        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user2->id,
            'me_profile_id' => $profile2->id,
            'role' => 'member',
            'joined_at' => now(),
        ]);

        $schedule = CircleSchedule::create([
            'circle_id' => $circle->id,
            'created_by' => $user->id,
            'title' => 'オフ会',
            'start_at' => $now->copy()->addMinutes(30),
            'end_at' => $now->copy()->addMinutes(90),
            'is_all_day' => false,
            'note' => null,
            'location' => null,
            'visibility' => 'members',
        ]);

        CircleScheduleParticipant::create([
            'circle_schedule_id' => $schedule->id,
            'user_id' => $user->id,
            'status' => 'accepted',
        ]);

        CircleScheduleParticipant::create([
            'circle_schedule_id' => $schedule->id,
            'user_id' => $user2->id,
            'status' => 'accepted',
        ]);

        Artisan::call('app:dispatch-schedule-notifications');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'source_type' => 'user_schedule',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'source_type' => 'circle_schedule',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user2->id,
            'source_type' => 'circle_schedule',
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-nt-001',
        ])->getJson('/api/me/notifications?unread=1');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success' => [
                    'data' => [
                        'items',
                        'nextCursor',
                    ],
                ],
            ]);

        $notificationId = $response->json('success.data.items.0.id');
        $this->assertNotEmpty($notificationId);

        $read = $this->withHeaders([
            'X-Device-Id' => 'device-nt-001',
        ])->postJson("/api/me/notifications/{$notificationId}/read");

        $read->assertStatus(200)
            ->assertJsonPath('success.data.readAt', fn($value) => !empty($value));

        $otherRead = $this->withHeaders([
            'X-Device-Id' => 'device-nt-002',
        ])->postJson("/api/me/notifications/{$notificationId}/read");

        $otherRead->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
