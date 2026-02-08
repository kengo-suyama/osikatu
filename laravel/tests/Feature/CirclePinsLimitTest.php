<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CirclePinsLimitTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithMember(string $deviceId, string $role, string $userPlan): array
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
            'name' => 'Pins Test Circle',
            'plan' => 'free',
            'plan_required' => 'free',
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

    public function test_free_owner_can_create_up_to_3_pins_then_limit_exceeded(): void
    {
        [$circle] = $this->createCircleWithMember('device-pins-free-owner-001', 'owner', 'free');

        for ($i = 1; $i <= 3; $i += 1) {
            $this->withHeaders([
                'X-Device-Id' => 'device-pins-free-owner-001',
            ])->postJson("/api/circles/{$circle->id}/pins", [
                'body' => "pin {$i}",
            ])->assertStatus(201)
                ->assertHeader('X-Osikatu-Deprecated', 'pins-v1')
                ->assertJsonPath('success.data.isPinned', true);
        }

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-free-owner-001',
        ])->postJson("/api/circles/{$circle->id}/pins", [
            'body' => 'pin 4',
        ])->assertStatus(422)
            ->assertHeader('X-Osikatu-Deprecated', 'pins-v1')
            ->assertJsonPath('error.code', 'PIN_LIMIT_EXCEEDED');
    }

    public function test_plus_owner_can_create_up_to_10_pins_then_limit_exceeded(): void
    {
        [$circle] = $this->createCircleWithMember('device-pins-plus-owner-001', 'owner', 'plus');

        for ($i = 1; $i <= 10; $i += 1) {
            $this->withHeaders([
                'X-Device-Id' => 'device-pins-plus-owner-001',
            ])->postJson("/api/circles/{$circle->id}/pins", [
                'body' => "pin {$i}",
            ])->assertStatus(201)
                ->assertHeader('X-Osikatu-Deprecated', 'pins-v1');
        }

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-plus-owner-001',
        ])->postJson("/api/circles/{$circle->id}/pins", [
            'body' => 'pin 11',
        ])->assertStatus(422)
            ->assertHeader('X-Osikatu-Deprecated', 'pins-v1')
            ->assertJsonPath('error.code', 'PIN_LIMIT_EXCEEDED');
    }

    public function test_member_cannot_create_pins(): void
    {
        [$circle] = $this->createCircleWithMember('device-pins-member-001', 'member', 'plus');

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-member-001',
        ])->postJson("/api/circles/{$circle->id}/pins", [
            'body' => 'pin 1',
        ])->assertStatus(403)
            ->assertHeader('X-Osikatu-Deprecated', 'pins-v1')
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_unpin_frees_a_slot(): void
    {
        [$circle] = $this->createCircleWithMember('device-pins-unpin-001', 'owner', 'free');

        $ids = [];
        for ($i = 1; $i <= 3; $i += 1) {
            $res = $this->withHeaders([
                'X-Device-Id' => 'device-pins-unpin-001',
            ])->postJson("/api/circles/{$circle->id}/pins", [
                'body' => "pin {$i}",
            ]);
            $res->assertStatus(201);
            $res->assertHeader('X-Osikatu-Deprecated', 'pins-v1');
            $ids[] = $res->json('success.data.id');
        }

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-unpin-001',
        ])->postJson("/api/circles/{$circle->id}/pins/{$ids[0]}/unpin")
            ->assertOk()
            ->assertHeader('X-Osikatu-Deprecated', 'pins-v1')
            ->assertJsonPath('success.data.unpinned', true);

        $this->withHeaders([
            'X-Device-Id' => 'device-pins-unpin-001',
        ])->postJson("/api/circles/{$circle->id}/pins", [
            'body' => 'pin 4',
        ])->assertStatus(201)
            ->assertHeader('X-Osikatu-Deprecated', 'pins-v1');
    }
}
