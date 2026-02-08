<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleSchedule;
use App\Models\CircleScheduleProposal;
use App\Models\MeProfile;
use App\Models\Notification;
use App\Models\OperationLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CircleScheduleProposalsTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithMembers(string $plan = 'plus', int $count = 2): array
    {
        $users = [];
        $profiles = [];
        $members = [];

        $circle = null;

        for ($i = 0; $i < $count; $i++) {
            $user = User::factory()->create();
            $profile = MeProfile::create([
                'device_id' => 'device-proposal-' . $i,
                'nickname' => 'メンバー' . $i,
                'initial' => 'M',
                'user_id' => $user->id,
            ]);

            if ($i === 0) {
                $circle = Circle::create([
                    'name' => '提案テスト',
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
            }

            $role = $i === 0 ? 'owner' : 'member';
            $member = CircleMember::create([
                'circle_id' => $circle->id,
                'user_id' => $user->id,
                'me_profile_id' => $profile->id,
                'role' => $role,
                'joined_at' => now(),
            ]);

            $users[] = $user;
            $profiles[] = $profile;
            $members[] = $member;
        }

        return [$circle, $members, $profiles];
    }

    private function proposalPayload(): array
    {
        return [
            'title' => 'オフ会提案',
            'startAt' => '2026-03-01T10:00:00+09:00',
            'endAt' => '2026-03-01T12:00:00+09:00',
            'isAllDay' => false,
            'note' => '場所は後日決定',
            'location' => '渋谷',
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // Create proposal (any member)
    // ═══════════════════════════════════════════════════════════════

    public function test_member_can_create_proposal(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('free', 2);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());

        $response->assertStatus(201);
        $proposal = $response->json('success.data.proposal');
        $this->assertEquals('オフ会提案', $proposal['title']);
        $this->assertEquals('pending', $proposal['status']);
        $this->assertEquals($members[1]->id, $proposal['createdByMemberId']);
    }

    public function test_owner_can_create_proposal(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());

        $response->assertStatus(201);
        $this->assertEquals('pending', $response->json('success.data.proposal.status'));
    }

    public function test_create_proposal_validation(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('free', 2);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", [
            'title' => '',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_non_member_cannot_create_proposal(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('free', 2);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-unknown-999',
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());

        $response->assertStatus(404);
    }

    // ═══════════════════════════════════════════════════════════════
    // List proposals (owner/admin + plus)
    // ═══════════════════════════════════════════════════════════════

    public function test_owner_can_list_proposals(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        // Create a proposal as member
        $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload())
            ->assertStatus(201);

        // Owner lists
        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/schedule-proposals?status=pending");

        $response->assertStatus(200);
        $items = $response->json('success.data.items');
        $this->assertCount(1, $items);
        $this->assertEquals('pending', $items[0]['status']);
    }

    public function test_member_cannot_list_proposals(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->getJson("/api/circles/{$circle->id}/schedule-proposals");

        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    // ═══════════════════════════════════════════════════════════════
    // My proposals (any member)
    // ═══════════════════════════════════════════════════════════════

    public function test_member_can_list_own_proposals(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('free', 2);

        // Create proposal
        $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload())
            ->assertStatus(201);

        // List own proposals
        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->getJson("/api/circles/{$circle->id}/schedule-proposals/mine");

        $response->assertStatus(200);
        $items = $response->json('success.data.items');
        $this->assertCount(1, $items);
    }

    public function test_member_sees_only_own_proposals(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('free', 3);

        // Member 1 creates proposal
        $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload())
            ->assertStatus(201);

        // Member 2 sees nothing in their own proposals
        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[2]->device_id,
        ])->getJson("/api/circles/{$circle->id}/schedule-proposals/mine");

        $response->assertStatus(200);
        $items = $response->json('success.data.items');
        $this->assertCount(0, $items);
    }

    // ═══════════════════════════════════════════════════════════════
    // Approve proposal
    // ═══════════════════════════════════════════════════════════════

    public function test_owner_can_approve_proposal(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        // Create proposal as member
        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $create->assertStatus(201);
        $proposalId = $create->json('success.data.proposal.id');

        // Approve as owner
        $approve = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve", [
            'comment' => 'いいですね！',
        ]);

        $approve->assertStatus(200);
        $proposal = $approve->json('success.data.proposal');
        $this->assertEquals('approved', $proposal['status']);
        $this->assertEquals($members[0]->id, $proposal['reviewedByMemberId']);
        $this->assertNotNull($proposal['approvedScheduleId']);
        $this->assertNotNull($proposal['reviewedAt']);
        $this->assertEquals('いいですね！', $proposal['reviewComment']);

        // Verify schedule was created
        $scheduleId = $proposal['approvedScheduleId'];
        $this->assertStringStartsWith('cs_', $scheduleId);

        $schedule = $approve->json('success.data.schedule');
        $this->assertEquals('オフ会提案', $schedule['title']);

        // Verify the schedule exists in the calendar
        $calendarResponse = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/calendar?from=2026-03-01&to=2026-03-31");

        $calendarResponse->assertStatus(200);
        $calendarItems = $calendarResponse->json('success.data.items');
        $this->assertCount(1, $calendarItems);
        $this->assertEquals('オフ会提案', $calendarItems[0]['title']);
    }

    public function test_member_cannot_approve(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve");

        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_double_approve_returns_409(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        // First approve
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve")
            ->assertStatus(200);

        // Second approve → 409
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve")
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'ALREADY_REVIEWED');
    }

    // ═══════════════════════════════════════════════════════════════
    // Reject proposal
    // ═══════════════════════════════════════════════════════════════

    public function test_owner_can_reject_proposal(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        $reject = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/reject", [
            'comment' => '日程調整お願い',
        ]);

        $reject->assertStatus(200);
        $proposal = $reject->json('success.data.proposal');
        $this->assertEquals('rejected', $proposal['status']);
        $this->assertNull($proposal['approvedScheduleId']);
        $this->assertEquals('日程調整お願い', $proposal['reviewComment']);
    }

    public function test_reject_after_reject_returns_409(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        // First reject
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/reject")
            ->assertStatus(200);

        // Second reject → 409
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/reject")
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'ALREADY_REVIEWED');
    }

    // ═══════════════════════════════════════════════════════════════
    // Status transitions
    // ═══════════════════════════════════════════════════════════════

    public function test_proposal_status_reflected_in_mine(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        // Create
        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        // Reject
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/reject")
            ->assertStatus(200);

        // Member sees rejected in own proposals
        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->getJson("/api/circles/{$circle->id}/schedule-proposals/mine");

        $items = $response->json('success.data.items');
        $this->assertCount(1, $items);
        $this->assertEquals('rejected', $items[0]['status']);
    }

    // ═══════════════════════════════════════════════════════════════
    // Notification tests
    // ═══════════════════════════════════════════════════════════════

    public function test_approve_creates_notification_for_proposer(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        // Member creates proposal
        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        // Owner approves with comment
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve", [
            'comment' => '良い提案です',
        ])->assertStatus(200);

        // Proposer should have a notification
        $notifications = Notification::where('user_id', $members[1]->user_id)
            ->where('source_type', 'schedule_proposal')
            ->where('source_id', $proposalId)
            ->get();

        $this->assertCount(1, $notifications);
        $notification = $notifications->first();
        $this->assertEquals('proposal.approved', $notification->type);
        $this->assertStringContainsString('承認', $notification->title);
        $this->assertStringContainsString('オフ会提案', $notification->body);
        $this->assertStringContainsString('3/1', $notification->body);
        $this->assertStringContainsString('良い提案です', $notification->body);
        $this->assertStringContainsString("/circles/{$circle->id}/calendar", $notification->link_url);
        $this->assertStringContainsString("focusProposalId={$proposalId}", $notification->link_url);

        // source_meta
        $this->assertIsArray($notification->source_meta);
        $this->assertEquals($circle->id, $notification->source_meta['circleId']);
    }

    public function test_reject_creates_notification_for_proposer(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        // Owner rejects
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/reject", [
            'comment' => '日程調整お願い',
        ])->assertStatus(200);

        $notifications = Notification::where('user_id', $members[1]->user_id)
            ->where('source_type', 'schedule_proposal')
            ->where('source_id', $proposalId)
            ->get();

        $this->assertCount(1, $notifications);
        $notification = $notifications->first();
        $this->assertEquals('proposal.rejected', $notification->type);
        $this->assertStringContainsString('却下', $notification->title);
        $this->assertStringContainsString('3/1', $notification->body);
        $this->assertStringContainsString('日程調整お願い', $notification->body);

        // source_meta + link_url
        $this->assertIsArray($notification->source_meta);
        $this->assertEquals($circle->id, $notification->source_meta['circleId']);
        $this->assertStringContainsString("focusProposalId={$proposalId}", $notification->link_url);
    }

    public function test_notification_visible_in_me_notifications(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve")
            ->assertStatus(200);

        // Proposer checks notifications via API
        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->getJson('/api/me/notifications');

        $response->assertStatus(200);
        $items = $response->json('success.data.items');
        $this->assertGreaterThanOrEqual(1, count($items));

        $found = collect($items)->first(fn ($n) => $n['sourceType'] === 'scheduleProposal');
        $this->assertNotNull($found);
        $this->assertEquals('proposal.approved', $found['type']);

        // openPath + sourceMeta in DTO
        $this->assertNotNull($found['openPath']);
        $this->assertStringContainsString("/circles/{$circle->id}/calendar", $found['openPath']);
        $this->assertStringContainsString("tab=mine", $found['openPath']);
        $this->assertNotNull($found['sourceMeta']);
        $this->assertEquals($circle->id, $found['sourceMeta']['circleId']);
    }

    // ═══════════════════════════════════════════════════════════════
    // Audit log tests
    // ═══════════════════════════════════════════════════════════════

    public function test_approve_creates_operation_log(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve")
            ->assertStatus(200);

        $log = OperationLog::where('circle_id', $circle->id)
            ->where('action', 'proposal.approve')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($proposalId, $log->meta['proposalId'] ?? null);
        $this->assertEquals('approved', $log->meta['result'] ?? null);
    }

    public function test_approve_response_has_request_id(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve");

        $response->assertStatus(200);
        $response->assertHeader('X-Request-Id');

        $requestId = $response->headers->get('X-Request-Id');
        $this->assertNotEmpty($requestId);

        $log = OperationLog::where('circle_id', $circle->id)
            ->where('action', 'proposal.approve')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($requestId, $log->meta['request_id'] ?? null);
    }

    public function test_reject_creates_operation_log(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/reject")
            ->assertStatus(200);

        $log = OperationLog::where('circle_id', $circle->id)
            ->where('action', 'proposal.reject')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($proposalId, $log->meta['proposalId'] ?? null);
        $this->assertEquals('rejected', $log->meta['result'] ?? null);
    }

    public function test_double_approve_no_duplicate_log(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals", $this->proposalPayload());
        $proposalId = $create->json('success.data.proposal.id');

        // First approve → 200
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve")
            ->assertStatus(200);

        // Second approve → 409
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/schedule-proposals/{$proposalId}/approve")
            ->assertStatus(409);

        // Only one log entry
        $logCount = OperationLog::where('circle_id', $circle->id)
            ->where('action', 'proposal.approve')
            ->count();

        $this->assertEquals(1, $logCount);
    }
}
