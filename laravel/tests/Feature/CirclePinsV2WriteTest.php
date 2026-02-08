<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CirclePinsV2WriteTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithMember(string $deviceId, string $role, string $userPlan): Circle
    {
        $user = User::factory()->create([
            'plan' => $userPlan,
        ]);

        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Member',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => 'Pins V2 Test Circle',
            'plan' => 'free',
            'plan_required' => 'free',
            'max_members' => 30,
            'created_by' => $user->id,
        ]);

        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => $role,
            'joined_at' => now(),
        ]);

        return $circle;
    }

    public function test_free_owner_can_create_up_to_3_pins_v2_then_limit_exceeded(): void
    {
        $circle = $this->createCircleWithMember('device-pins-v2-free-owner-001', 'owner', 'free');

        for ($i = 1; $i <= 3; $i += 1) {
            $this->withHeaders([
                'X-Device-Id' => 'device-pins-v2-free-owner-001',
            ])->postJson("/api/circles/{$circle->id}/pins-v2", [
                'body' => "pin {$i}",
            ])->assertStatus(201)
                ->assertJsonPath('success.data.title', "pin {$i}");
        }

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-v2-free-owner-001',
        ])->postJson("/api/circles/{$circle->id}/pins-v2", [
            'body' => 'pin 4',
        ])->assertStatus(422)
            ->assertJsonPath('error.code', 'PIN_LIMIT_EXCEEDED');
    }

    public function test_plus_owner_can_create_up_to_10_pins_v2_then_limit_exceeded(): void
    {
        $circle = $this->createCircleWithMember('device-pins-v2-plus-owner-001', 'owner', 'plus');

        for ($i = 1; $i <= 10; $i += 1) {
            $this->withHeaders([
                'X-Device-Id' => 'device-pins-v2-plus-owner-001',
            ])->postJson("/api/circles/{$circle->id}/pins-v2", [
                'body' => "pin {$i}",
            ])->assertStatus(201);
        }

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-v2-plus-owner-001',
        ])->postJson("/api/circles/{$circle->id}/pins-v2", [
            'body' => 'pin 11',
        ])->assertStatus(422)
            ->assertJsonPath('error.code', 'PIN_LIMIT_EXCEEDED');
    }

    public function test_member_cannot_create_pins_v2(): void
    {
        $circle = $this->createCircleWithMember('device-pins-v2-member-001', 'member', 'plus');

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-v2-member-001',
        ])->postJson("/api/circles/{$circle->id}/pins-v2", [
            'body' => 'pin 1',
        ])->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_update_and_unpin_v2_work_and_unpin_frees_a_slot(): void
    {
        $circle = $this->createCircleWithMember('device-pins-v2-update-001', 'owner', 'free');

        $res = $this->withHeaders([
            'X-Device-Id' => 'device-pins-v2-update-001',
        ])->postJson("/api/circles/{$circle->id}/pins-v2", [
            'body' => "Old title\nURL: https://old.example\n- [ ] a",
        ])->assertStatus(201);

        $pinId = (int) $res->json('success.data.id');

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-v2-update-001',
        ])->patchJson("/api/circles/{$circle->id}/pins-v2/{$pinId}", [
            'body' => "New title\nURL: https://new.example\n- [x] a",
        ])->assertOk()
            ->assertJsonPath('success.data.id', $pinId)
            ->assertJsonPath('success.data.title', 'New title')
            ->assertJsonPath('success.data.url', 'https://new.example');

        // Fill to limit
        $ids = [$pinId];
        for ($i = 2; $i <= 3; $i += 1) {
            $r = $this->withHeaders([
                'X-Device-Id' => 'device-pins-v2-update-001',
            ])->postJson("/api/circles/{$circle->id}/pins-v2", [
                'body' => "pin {$i}",
            ])->assertStatus(201);
            $ids[] = (int) $r->json('success.data.id');
        }

        // 4th should fail
        $this->withHeaders([
            'X-Device-Id' => 'device-pins-v2-update-001',
        ])->postJson("/api/circles/{$circle->id}/pins-v2", [
            'body' => 'pin 4',
        ])->assertStatus(422)
            ->assertJsonPath('error.code', 'PIN_LIMIT_EXCEEDED');

        // Unpin first and retry
        $this->withHeaders([
            'X-Device-Id' => 'device-pins-v2-update-001',
        ])->postJson("/api/circles/{$circle->id}/pins-v2/{$ids[0]}/unpin")
            ->assertOk()
            ->assertJsonPath('success.data.unpinned', true);

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-v2-update-001',
        ])->postJson("/api/circles/{$circle->id}/pins-v2", [
            'body' => 'pin 4',
        ])->assertStatus(201);
    }
}

