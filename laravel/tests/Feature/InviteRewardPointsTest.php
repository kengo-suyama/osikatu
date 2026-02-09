<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleInvite;
use App\Models\MeProfile;
use App\Models\PointsTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InviteRewardPointsTest extends TestCase
{
    use RefreshDatabase;

    public function test_invite_accept_rewards_both_sides_once(): void
    {
        $inviter = User::factory()->create();
        $circle = Circle::factory()->create();
        $invite = CircleInvite::create([
            'circle_id' => $circle->id,
            'type' => 'code',
            'code' => '12345678',
            'role' => 'member',
            'used_count' => 0,
            'created_by' => $inviter->id,
        ]);

        $invitee = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-invitee-001',
            'nickname' => 'Invitee',
            'initial' => 'I',
            'user_id' => $invitee->id,
        ]);

        $first = $this->withHeaders(['X-Device-Id' => 'dev-invitee-001'])
            ->postJson('/api/invites/accept', ['code' => $invite->code]);

        $first->assertStatus(200);

        $this->assertSame(
            50,
            (int) PointsTransaction::query()
                ->where('user_id', $inviter->id)
                ->whereNull('circle_id')
                ->where('reason', 'invite_reward_inviter')
                ->sum('delta')
        );

        $this->assertSame(
            20,
            (int) PointsTransaction::query()
                ->where('user_id', $invitee->id)
                ->whereNull('circle_id')
                ->where('reason', 'invite_reward_invitee')
                ->sum('delta')
        );

        // Second accept is idempotent (already member) -> no extra rewards.
        $second = $this->withHeaders(['X-Device-Id' => 'dev-invitee-001'])
            ->postJson('/api/invites/accept', ['code' => $invite->code]);

        $second->assertStatus(200);

        $this->assertSame(
            1,
            PointsTransaction::query()
                ->where('user_id', $inviter->id)
                ->whereNull('circle_id')
                ->where('reason', 'invite_reward_inviter')
                ->count()
        );

        $this->assertSame(
            1,
            PointsTransaction::query()
                ->where('user_id', $invitee->id)
                ->whereNull('circle_id')
                ->where('reason', 'invite_reward_invitee')
                ->count()
        );
    }
}

