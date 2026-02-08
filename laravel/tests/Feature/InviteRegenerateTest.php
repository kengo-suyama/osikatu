<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleInvite;
use App\Models\CircleMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InviteRegenerateTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_regenerate_invite(): void
    {
        $user = User::factory()->create(['plan' => 'plus']);
        $circle = Circle::factory()->create(['plan' => 'plus']);
        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        // Create existing invite
        $old = CircleInvite::create([
            'circle_id' => $circle->id,
            'creator_user_id' => $user->id,
            'code' => 'OLDCODE1',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => 'dev-invite-regen'])
            ->postJson("/api/circles/{$circle->id}/invites/regenerate");

        $response->assertStatus(200);
        $data = $response->json('success.data');
        $this->assertNotEquals('OLDCODE1', $data['code']);

        // Old invite should be revoked
        $this->assertNotNull($old->fresh()->revoked_at);
    }

    public function test_member_cannot_regenerate_invite(): void
    {
        $owner = User::factory()->create(['plan' => 'plus']);
        $member = User::factory()->create(['plan' => 'free']);
        $circle = Circle::factory()->create(['plan' => 'plus']);
        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $owner->id,
            'role' => 'owner',
        ]);
        CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        $response = $this->withHeaders(['X-Device-Id' => 'dev-invite-member'])
            ->postJson("/api/circles/{$circle->id}/invites/regenerate");

        $response->assertStatus(403);
    }
}
