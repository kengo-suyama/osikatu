<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationOpenPathTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId, string $plan = 'free'): array
    {
        $user = User::factory()->create(['plan' => $plan]);
        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Member',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        return [$user, $profile];
    }

    private function createCircle(int $userId): Circle
    {
        return Circle::create([
            'name' => 'openPath Circle',
            'description' => 'test',
            'oshi_label' => '\u63a8\u3057',
            'oshi_tag' => 'test',
            'oshi_tags' => ['test'],
            'is_public' => true,
            'plan' => 'premium',
            'plan_required' => 'free',
            'join_policy' => 'request',
            'max_members' => 30,
            'created_by' => $userId,
        ]);
    }

    public function test_schedule_proposal_openpath_manager_gets_proposals_tab(): void
    {
        [$user, $profile] = $this->createProfile('device-op-mgr-001', 'plus');
        $circle = $this->createCircle($user->id);

        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        Notification::create([
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'source_type' => 'schedule_proposal',
            'source_id' => 42,
            'source_meta' => ['circleId' => $circle->id],
            'type' => 'proposal.approved',
            'title' => 'Proposal approved',
            'body' => 'Test body',
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-op-mgr-001',
        ])->getJson('/api/me/notifications');

        $response->assertStatus(200);

        $openPath = $response->json('success.data.items.0.openPath');
        $this->assertStringContainsString('tab=proposals', $openPath);
        $this->assertStringContainsString("/circles/{$circle->id}/calendar", $openPath);
    }

    public function test_schedule_proposal_openpath_member_gets_mine_tab(): void
    {
        [$user, $profile] = $this->createProfile('device-op-mem-001', 'free');
        $circle = $this->createCircle($user->id);

        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => 'member',
            'joined_at' => now(),
        ]);

        Notification::create([
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'source_type' => 'schedule_proposal',
            'source_id' => 99,
            'source_meta' => ['circleId' => $circle->id],
            'type' => 'proposal.rejected',
            'title' => 'Proposal rejected',
            'body' => 'Test body',
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-op-mem-001',
        ])->getJson('/api/me/notifications');

        $response->assertStatus(200);

        $openPath = $response->json('success.data.items.0.openPath');
        $this->assertStringContainsString('tab=mine', $openPath);
        $this->assertStringContainsString("/circles/{$circle->id}/calendar", $openPath);
    }

    public function test_pins_openpath(): void
    {
        [$user, $profile] = $this->createProfile('device-op-pin-001');

        Notification::create([
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'source_type' => 'pins',
            'source_id' => 10,
            'source_meta' => ['circleId' => 55],
            'type' => 'pin.created',
            'title' => 'New pin',
            'body' => 'Test body',
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-op-pin-001',
        ])->getJson('/api/me/notifications');

        $response->assertStatus(200);
        $response->assertJsonPath('success.data.items.0.openPath', '/circles/55/pins');
    }

    public function test_settlement_openpath(): void
    {
        [$user, $profile] = $this->createProfile('device-op-stl-001');

        Notification::create([
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'source_type' => 'settlement',
            'source_id' => 20,
            'source_meta' => ['circleId' => 77],
            'type' => 'settlement.created',
            'title' => 'New settlement',
            'body' => 'Test body',
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-op-stl-001',
        ])->getJson('/api/me/notifications');

        $response->assertStatus(200);
        $response->assertJsonPath('success.data.items.0.openPath', '/circles/77/settlements');
    }
}
