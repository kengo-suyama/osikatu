<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\MeProfile;
use App\Models\OperationLog;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettlementTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithMember(string $deviceId, string $role = 'owner', string $plan = 'plus'): array
    {
        $user = User::factory()->create();
        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Member',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        $circle = Circle::create([
            'name' => 'テストサークル',
            'description' => '精算テスト',
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

    private function addCircleMember(Circle $circle, string $deviceId, string $role = 'member'): CircleMember
    {
        $user = User::factory()->create();
        $profile = MeProfile::create([
            'device_id' => $deviceId,
            'nickname' => 'Member',
            'initial' => 'M',
            'user_id' => $user->id,
        ]);

        return CircleMember::create([
            'circle_id' => $circle->id,
            'user_id' => $user->id,
            'me_profile_id' => $profile->id,
            'role' => $role,
            'joined_at' => now(),
        ]);
    }

    public function test_plus_owner_can_list_settlements(): void
    {
        [$circle, $member] = $this->createCircleWithMember('device-settlement-001', 'owner', 'plus');
        $this->addCircleMember($circle, 'device-settlement-002', 'member');

        Settlement::create([
            'circle_id' => $circle->id,
            'created_by' => $member->user_id,
            'title' => '古い精算',
            'amount_int' => 5000,
            'currency' => 'JPY',
            'settled_at' => '2026-01-30',
        ]);

        Settlement::create([
            'circle_id' => $circle->id,
            'created_by' => $member->user_id,
            'title' => '新しい精算',
            'amount_int' => 8000,
            'currency' => 'JPY',
            'settled_at' => '2026-02-01',
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-settlement-001',
        ])->getJson("/api/circles/{$circle->id}/settlements");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success' => [
                    'data' => [
                        'items',
                        'members',
                    ],
                ],
            ]);

        $items = $response->json('success.data.items');
        $this->assertIsArray($items);
        $this->assertSame('2026-02-01', $items[0]['settledAt'] ?? null);
    }

    public function test_plus_owner_can_create_and_view_settlement_and_log(): void
    {
        [$circle, $member] = $this->createCircleWithMember('device-settlement-003', 'owner', 'plus');
        $otherMember = $this->addCircleMember($circle, 'device-settlement-004', 'member');

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-settlement-003',
        ])->postJson("/api/circles/{$circle->id}/settlements", [
            'title' => '遠征交通費',
            'amount' => 12000,
            'participantUserIds' => [$member->user_id, $otherMember->user_id],
            'splitMode' => 'equal',
            'settledAt' => '2026-02-01',
            'notes' => 'URLは保存しない',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success' => [
                    'data' => [
                        'id',
                        'participants',
                        'transfers',
                        'settledAt',
                        'splitMode',
                    ],
                ],
            ]);

        $settlementId = $response->json('success.data.id');

        $detail = $this->withHeaders([
            'X-Device-Id' => 'device-settlement-003',
        ])->getJson("/api/circles/{$circle->id}/settlements/{$settlementId}");

        $detail->assertStatus(200)
            ->assertJsonPath('success.data.id', $settlementId);

        $this->assertDatabaseHas('operation_logs', [
            'action' => 'settlement.create',
            'circle_id' => $circle->id,
        ]);

        $log = OperationLog::query()
            ->where('action', 'settlement.create')
            ->latest('id')
            ->first();

        $meta = $log?->meta ?? [];
        $this->assertIsArray($meta);
        $this->assertArrayHasKey('settlementId', $meta);
        $this->assertArrayNotHasKey('title', $meta);
        $this->assertArrayNotHasKey('participantUserIds', $meta);
        $this->assertArrayNotHasKey('notes', $meta);
    }

    public function test_non_plus_is_forbidden(): void
    {
        [$circle, $member] = $this->createCircleWithMember('device-settlement-005', 'owner', 'free');

        $settlement = Settlement::create([
            'circle_id' => $circle->id,
            'created_by' => $member->user_id,
            'title' => '精算',
            'amount_int' => 1000,
            'currency' => 'JPY',
            'settled_at' => '2026-02-01',
        ]);

        $this->withHeaders([
            'X-Device-Id' => 'device-settlement-005',
        ])->getJson("/api/circles/{$circle->id}/settlements")
            ->assertStatus(402)
            ->assertJsonPath('error.code', 'PLAN_REQUIRED')
            ->assertJsonPath('error.details.requiredPlan', 'plus');

        $this->withHeaders([
            'X-Device-Id' => 'device-settlement-005',
        ])->postJson("/api/circles/{$circle->id}/settlements", [
            'title' => '精算',
            'amount' => 1000,
            'participantUserIds' => [$member->user_id],
            'splitMode' => 'equal',
            'settledAt' => '2026-02-01',
        ])->assertStatus(402)
            ->assertJsonPath('error.code', 'PLAN_REQUIRED')
            ->assertJsonPath('error.details.requiredPlan', 'plus');

        $this->withHeaders([
            'X-Device-Id' => 'device-settlement-005',
        ])->getJson("/api/circles/{$circle->id}/settlements/{$settlement->id}")
            ->assertStatus(402)
            ->assertJsonPath('error.code', 'PLAN_REQUIRED')
            ->assertJsonPath('error.details.requiredPlan', 'plus');
    }

    public function test_plus_member_is_forbidden(): void
    {
        [$circle] = $this->createCircleWithMember('device-settlement-006', 'member', 'plus');

        $this->withHeaders([
            'X-Device-Id' => 'device-settlement-006',
        ])->getJson("/api/circles/{$circle->id}/settlements")
            ->assertStatus(403);
    }
}
