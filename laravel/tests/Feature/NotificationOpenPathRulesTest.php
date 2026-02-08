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

class NotificationOpenPathRulesTest extends TestCase
{
    use RefreshDatabase;

    private function createUserWithProfile(string $deviceId, string $plan): array
    {
        $user = User::factory()->create([
            'plan' => $plan,
        ]);

        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Member',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        return [$user, $profile];
    }

    private function createCircle(): Circle
    {
        return Circle::create([
            'name' => '通知OpenPathテスト',
            'description' => 'テスト',
            'oshi_label' => '推し',
            'oshi_tag' => 'test',
            'oshi_tags' => ['test'],
            'is_public' => true,
            'plan' => 'plus',
            'plan_required' => 'free',
            'join_policy' => 'request',
            'max_members' => 30,
            'created_by' => 1,
        ]);
    }

    public function test_schedule_proposal_open_path_is_role_based(): void
    {
        $circle = $this->createCircle();

        // Plus owner/admin => proposals tab
        [$plusOwner, $plusOwnerProfile] = $this->createUserWithProfile('device-openpath-plus-owner', 'plus');
        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $plusOwner->id,
            'me_profile_id' => $plusOwnerProfile->id,
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        Notification::create([
            'user_id' => $plusOwner->id,
            'me_profile_id' => $plusOwnerProfile->id,
            'source_type' => 'schedule_proposal',
            'source_id' => 42,
            'source_meta' => ['circleId' => $circle->id],
            'type' => 'proposal.approved',
            'title' => 'approved',
            'body' => 'body',
            'link_url' => "/circles/{$circle->id}/calendar?focusProposalId=42",
        ]);

        $res = $this->withHeaders([
            'X-Device-Id' => $plusOwnerProfile->device_id,
        ])->getJson('/api/me/notifications');

        $res->assertStatus(200);
        $items = $res->json('success.data.items');
        $this->assertCount(1, $items);
        $this->assertEquals("/circles/{$circle->id}/calendar?tab=proposals", $items[0]['openPath']);

        // Free owner => mine tab (plus requirement)
        [$freeOwner, $freeOwnerProfile] = $this->createUserWithProfile('device-openpath-free-owner', 'free');
        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $freeOwner->id,
            'me_profile_id' => $freeOwnerProfile->id,
            'role' => 'owner',
            'joined_at' => now(),
        ]);

        Notification::create([
            'user_id' => $freeOwner->id,
            'me_profile_id' => $freeOwnerProfile->id,
            'source_type' => 'schedule_proposal',
            'source_id' => 55,
            'source_meta' => ['circleId' => $circle->id],
            'type' => 'proposal.rejected',
            'title' => 'rejected',
            'body' => 'body',
            'link_url' => "/circles/{$circle->id}/calendar?focusProposalId=55",
        ]);

        $res2 = $this->withHeaders([
            'X-Device-Id' => $freeOwnerProfile->device_id,
        ])->getJson('/api/me/notifications');

        $res2->assertStatus(200);
        $items2 = $res2->json('success.data.items');
        $this->assertCount(1, $items2);
        $this->assertEquals("/circles/{$circle->id}/calendar?tab=mine", $items2[0]['openPath']);
    }

    public function test_pins_and_settlement_open_path_are_static(): void
    {
        $circle = $this->createCircle();

        [$user, $profile] = $this->createUserWithProfile('device-openpath-static', 'plus');
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
            'source_type' => 'pins',
            'source_id' => null,
            'source_meta' => ['circleId' => $circle->id],
            'type' => 'pins.updated',
            'title' => 'pins',
            'body' => 'body',
            'link_url' => null,
        ]);

        Notification::create([
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'source_type' => 'settlement',
            'source_id' => null,
            'source_meta' => ['circleId' => $circle->id],
            'type' => 'settlement.updated',
            'title' => 'settlement',
            'body' => 'body',
            'link_url' => null,
        ]);

        $res = $this->withHeaders([
            'X-Device-Id' => $profile->device_id,
        ])->getJson('/api/me/notifications');

        $res->assertStatus(200);
        $items = $res->json('success.data.items');
        $this->assertCount(2, $items);

        $paths = collect($items)->pluck('openPath')->all();
        $this->assertContains("/circles/{$circle->id}/pins", $paths);
        $this->assertContains("/circles/{$circle->id}/settlements", $paths);
    }
}

