<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\OperationLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OperationLogsDeleteTest extends TestCase
{
    use RefreshDatabase;

    private function createMeProfile(User $user, string $deviceId = null): MeProfile
    {
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId ?? Str::uuid(),
            'nickname' => $user->name,
            'initial' => strtoupper($user->name[0] ?? 'U'),
        ]);
    }

    private function createCircle(User $owner): Circle
    {
        return Circle::create([
            'name' => 'Test Circle',
            'plan' => 'plus',
            'max_members' => 10,
            'plan_required' => 'free',
            'last_activity_at' => now(),
            'created_by' => $owner->id,
        ]);
    }

    private function addMember(Circle $circle, User $user, string $role = 'member'): CircleMember
    {
        $profile = $this->createMeProfile($user);

        return CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => $role,
            'joined_at' => now(),
        ]);
    }

    private function createLog(array $attributes): OperationLog
    {
        return OperationLog::create(array_merge([
            'meta' => [],
            'created_at' => now(),
        ], $attributes));
    }

    public function test_user_can_delete_their_own_log(): void
    {
        $user = User::factory()->create();
        $log = $this->createLog([
            'user_id' => $user->id,
            'action' => 'test.action',
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/me/logs/lg_{$log->id}")
            ->assertOk()
            ->assertJson([
                'success' => ['data' => ['deleted' => true]],
            ]);

        $this->assertDatabaseMissing('operation_logs', ['id' => $log->id]);
    }

    public function test_user_cannot_delete_another_users_log(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $log = $this->createLog([
            'user_id' => $other->id,
            'action' => 'test.action',
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/me/logs/lg_{$log->id}")
            ->assertStatus(403)
            ->assertJson([
                'error' => [
                    'code' => 'FORBIDDEN',
                ],
            ]);

        $this->assertDatabaseHas('operation_logs', ['id' => $log->id]);
    }

    public function test_circle_owner_can_delete_logs(): void
    {
        $owner = User::factory()->create();
        $circle = $this->createCircle($owner);
        $this->addMember($circle, $owner, 'owner');

        $log = $this->createLog([
            'user_id' => $owner->id,
            'circle_id' => $circle->id,
            'action' => 'circle.log',
        ]);

        $this->actingAs($owner)
            ->deleteJson("/api/circles/{$circle->id}/logs/lg_{$log->id}")
            ->assertOk()
            ->assertJson([
                'success' => ['data' => ['deleted' => true]],
            ]);

        $this->assertDatabaseMissing('operation_logs', ['id' => $log->id]);
    }

    public function test_circle_member_cannot_delete_logs(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $circle = $this->createCircle($owner);
        $this->addMember($circle, $owner, 'owner');
        $this->addMember($circle, $member, 'member');

        $log = $this->createLog([
            'user_id' => $owner->id,
            'circle_id' => $circle->id,
            'action' => 'circle.log',
        ]);

        $this->actingAs($member)
            ->deleteJson("/api/circles/{$circle->id}/logs/lg_{$log->id}")
            ->assertStatus(403)
            ->assertJson([
                'error' => [
                    'code' => 'FORBIDDEN',
                ],
            ]);

        $this->assertDatabaseHas('operation_logs', ['id' => $log->id]);
    }

    public function test_circle_log_delete_returns_not_found_for_missing_log(): void
    {
        $owner = User::factory()->create();
        $circle = $this->createCircle($owner);
        $this->addMember($circle, $owner, 'owner');

        $this->actingAs($owner)
            ->deleteJson("/api/circles/{$circle->id}/logs/lg_99999")
            ->assertStatus(404)
            ->assertJson([
                'error' => [
                    'code' => 'NOT_FOUND',
                ],
            ]);
    }
}
