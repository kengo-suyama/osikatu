<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleSettlementExpense;
use App\Models\CircleSettlementExpenseShare;
use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CircleSettlementExpensesTest extends TestCase
{
    use RefreshDatabase;

    private function createCircleWithMembers(string $plan = 'plus', int $memberCount = 3): array
    {
        $circle = null;
        $members = [];
        $profiles = [];

        for ($i = 0; $i < $memberCount; $i++) {
            $user = User::factory()->create();
            $deviceId = 'device-settle-' . $i . '-' . uniqid();
            $profile = MeProfile::create([
                'device_id' => $deviceId,
                'nickname' => "メンバー{$i}",
                'initial' => "M",
                'user_id' => $user->id,
            ]);

            if ($i === 0) {
                $circle = Circle::create([
                    'name' => '割り勘テスト',
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

            $members[] = $member;
            $profiles[] = $profile;
        }

        return [$circle, $members, $profiles];
    }

    private function seedExpense(
        int $circleId,
        int $payerMemberId,
        string $title,
        int $amountYen,
        array $shares,
        string $status = 'active',
    ): CircleSettlementExpense {
        $expense = CircleSettlementExpense::create([
            'circle_id' => $circleId,
            'created_by' => $payerMemberId,
            'payer_member_id' => $payerMemberId,
            'title' => $title,
            'amount_yen' => $amountYen,
            'split_type' => 'equal',
            'occurred_on' => '2026-02-08',
            'status' => $status,
        ]);

        foreach ($shares as $share) {
            CircleSettlementExpenseShare::create([
                'expense_id' => $expense->id,
                'member_id' => $share['member_id'],
                'member_snapshot_name' => $share['name'],
                'share_yen' => $share['share_yen'],
            ]);
        }

        return $expense;
    }

    public function test_member_can_list_expenses_empty(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/expenses");

        $response->assertStatus(200)
            ->assertJsonPath('success.data.items', [])
            ->assertJsonPath('success.data.nextCursor', null);
    }

    public function test_member_can_view_balances_empty(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/balances");

        $response->assertStatus(200)
            ->assertJsonPath('success.data.items', [])
            ->assertJsonPath('success.data.totals.expenseCount', 0);
    }

    public function test_member_can_view_suggestions_empty(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/suggestions");

        $response->assertStatus(200)
            ->assertJsonPath('success.data.items', []);
    }

    public function test_free_plan_returns_403(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('free');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/expenses");

        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'PLAN_REQUIRED');
    }

    public function test_non_member_returns_404(): void
    {
        [$circle] = $this->createCircleWithMembers('plus');

        $response = $this->withHeaders([
            'X-Device-Id' => 'device-non-member-xxx',
        ])->getJson("/api/circles/{$circle->id}/settlements/expenses");

        $response->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');
    }

    public function test_balances_calculated_correctly(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 3);

        // Member 0 pays 3000 split 3 ways: each owes 1000
        $this->seedExpense($circle->id, $members[0]->id, 'ランチ', 3000, [
            ['member_id' => $members[0]->id, 'name' => 'メンバー0', 'share_yen' => 1000],
            ['member_id' => $members[1]->id, 'name' => 'メンバー1', 'share_yen' => 1000],
            ['member_id' => $members[2]->id, 'name' => 'メンバー2', 'share_yen' => 1000],
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/balances");

        $response->assertStatus(200);

        $items = $response->json('success.data.items');
        $this->assertCount(3, $items);

        // Member 0: paid 3000, owed 1000, net = +2000
        $m0 = collect($items)->firstWhere('memberId', $members[0]->id);
        $this->assertEquals(3000, $m0['paidYen']);
        $this->assertEquals(1000, $m0['owedYen']);
        $this->assertEquals(2000, $m0['netYen']);

        // Member 1: paid 0, owed 1000, net = -1000
        $m1 = collect($items)->firstWhere('memberId', $members[1]->id);
        $this->assertEquals(0, $m1['paidYen']);
        $this->assertEquals(1000, $m1['owedYen']);
        $this->assertEquals(-1000, $m1['netYen']);

        // Totals
        $this->assertEquals(3000, $response->json('success.data.totals.totalExpensesYen'));
        $this->assertEquals(1, $response->json('success.data.totals.expenseCount'));
    }

    public function test_void_expenses_excluded_from_balances(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        // Active expense
        $this->seedExpense($circle->id, $members[0]->id, 'ランチ', 2000, [
            ['member_id' => $members[0]->id, 'name' => 'メンバー0', 'share_yen' => 1000],
            ['member_id' => $members[1]->id, 'name' => 'メンバー1', 'share_yen' => 1000],
        ]);

        // Voided expense (should be excluded)
        $this->seedExpense($circle->id, $members[0]->id, '取消済', 5000, [
            ['member_id' => $members[0]->id, 'name' => 'メンバー0', 'share_yen' => 2500],
            ['member_id' => $members[1]->id, 'name' => 'メンバー1', 'share_yen' => 2500],
        ], 'void');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/balances");

        $response->assertStatus(200);

        // Only active expense counted
        $this->assertEquals(2000, $response->json('success.data.totals.totalExpensesYen'));
        $this->assertEquals(1, $response->json('success.data.totals.expenseCount'));

        $m0 = collect($response->json('success.data.items'))->firstWhere('memberId', $members[0]->id);
        $this->assertEquals(1000, $m0['netYen']); // paid 2000 - owed 1000
    }

    public function test_suggestions_deterministic(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 3);

        // Member 0 pays 3000 split 3 ways
        $this->seedExpense($circle->id, $members[0]->id, 'ランチ', 3000, [
            ['member_id' => $members[0]->id, 'name' => 'メンバー0', 'share_yen' => 1000],
            ['member_id' => $members[1]->id, 'name' => 'メンバー1', 'share_yen' => 1000],
            ['member_id' => $members[2]->id, 'name' => 'メンバー2', 'share_yen' => 1000],
        ]);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/suggestions");

        $response->assertStatus(200);

        $items = $response->json('success.data.items');
        $this->assertCount(2, $items);

        // Both debtors have same amount (-1000), sorted by memberId asc
        $this->assertLessThan($items[1]['fromMemberId'], $items[0]['fromMemberId']);

        // Both transfer to member 0
        $this->assertEquals($members[0]->id, $items[0]['toMemberId']);
        $this->assertEquals($members[0]->id, $items[1]['toMemberId']);
        $this->assertEquals(1000, $items[0]['amountYen']);
        $this->assertEquals(1000, $items[1]['amountYen']);

        // Run again — same result (deterministic)
        $response2 = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/suggestions");

        $items2 = $response2->json('success.data.items');
        $this->assertEquals($items[0]['fromMemberId'], $items2[0]['fromMemberId']);
        $this->assertEquals($items[1]['fromMemberId'], $items2[1]['fromMemberId']);
    }

    public function test_expenses_list_excludes_void(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $this->seedExpense($circle->id, $members[0]->id, 'アクティブ', 1000, [
            ['member_id' => $members[0]->id, 'name' => 'メンバー0', 'share_yen' => 500],
            ['member_id' => $members[1]->id, 'name' => 'メンバー1', 'share_yen' => 500],
        ]);

        $this->seedExpense($circle->id, $members[0]->id, '取消済', 2000, [
            ['member_id' => $members[0]->id, 'name' => 'メンバー0', 'share_yen' => 1000],
            ['member_id' => $members[1]->id, 'name' => 'メンバー1', 'share_yen' => 1000],
        ], 'void');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/expenses");

        $response->assertStatus(200);

        $items = $response->json('success.data.items');
        $this->assertCount(1, $items);
        $this->assertEquals('アクティブ', $items[0]['title']);
    }
}
