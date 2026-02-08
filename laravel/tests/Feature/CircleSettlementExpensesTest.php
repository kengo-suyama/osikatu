<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleSettlementExpense;
use App\Models\CircleSettlementExpenseShare;
use App\Models\MeProfile;
use App\Models\OperationLog;
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

    // ═══════════════════════════════════════════════════════════════
    // Read endpoint tests (from PR-B)
    // ═══════════════════════════════════════════════════════════════

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

    public function test_free_plan_returns_402(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('free');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/expenses");

        $response->assertStatus(402)
            ->assertJsonPath('error.code', 'PLAN_REQUIRED')
            ->assertJsonPath('error.details.requiredPlan', 'plus');
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

        $m0 = collect($items)->firstWhere('memberId', $members[0]->id);
        $this->assertEquals(3000, $m0['paidYen']);
        $this->assertEquals(1000, $m0['owedYen']);
        $this->assertEquals(2000, $m0['netYen']);

        $m1 = collect($items)->firstWhere('memberId', $members[1]->id);
        $this->assertEquals(0, $m1['paidYen']);
        $this->assertEquals(1000, $m1['owedYen']);
        $this->assertEquals(-1000, $m1['netYen']);

        $this->assertEquals(3000, $response->json('success.data.totals.totalExpensesYen'));
        $this->assertEquals(1, $response->json('success.data.totals.expenseCount'));
    }

    public function test_void_expenses_excluded_from_balances(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $this->seedExpense($circle->id, $members[0]->id, 'ランチ', 2000, [
            ['member_id' => $members[0]->id, 'name' => 'メンバー0', 'share_yen' => 1000],
            ['member_id' => $members[1]->id, 'name' => 'メンバー1', 'share_yen' => 1000],
        ]);

        $this->seedExpense($circle->id, $members[0]->id, '取消済', 5000, [
            ['member_id' => $members[0]->id, 'name' => 'メンバー0', 'share_yen' => 2500],
            ['member_id' => $members[1]->id, 'name' => 'メンバー1', 'share_yen' => 2500],
        ], 'void');

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/balances");

        $response->assertStatus(200);
        $this->assertEquals(2000, $response->json('success.data.totals.totalExpensesYen'));
        $this->assertEquals(1, $response->json('success.data.totals.expenseCount'));

        $m0 = collect($response->json('success.data.items'))->firstWhere('memberId', $members[0]->id);
        $this->assertEquals(1000, $m0['netYen']);
    }

    public function test_suggestions_deterministic(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 3);

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
        $this->assertLessThan($items[1]['fromMemberId'], $items[0]['fromMemberId']);
        $this->assertEquals($members[0]->id, $items[0]['toMemberId']);
        $this->assertEquals(1000, $items[0]['amountYen']);

        // Deterministic: same result on second call
        $response2 = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/suggestions");
        $items2 = $response2->json('success.data.items');
        $this->assertEquals($items[0]['fromMemberId'], $items2[0]['fromMemberId']);
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

    // ═══════════════════════════════════════════════════════════════
    // Create expense tests (PR-D)
    // ═══════════════════════════════════════════════════════════════

    public function test_create_equal_split_basic(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 3);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => 'ランチ',
            'amountYen' => 3000,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[1]->id, $members[2]->id],
        ]);

        $response->assertStatus(201);
        $expense = $response->json('success.data.expense');
        $this->assertEquals('ランチ', $expense['title']);
        $this->assertEquals(3000, $expense['amountYen']);
        $this->assertEquals('equal', $expense['splitType']);
        $this->assertCount(3, $expense['shares']);

        // Each share = 1000
        foreach ($expense['shares'] as $share) {
            $this->assertEquals(1000, $share['shareYen']);
        }
    }

    public function test_create_equal_split_rounding(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 3);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => 'ホテル',
            'amountYen' => 10001,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[1]->id, $members[2]->id],
        ]);

        $response->assertStatus(201);
        $expenseId = $response->json('success.data.expense.id');
        $shares = $response->json('success.data.expense.shares');
        $this->assertCount(3, $shares);

        // floor(10001/3) = 3333, remainder = 2 → payer gets 3335
        $payerShare = collect($shares)->firstWhere('memberId', $members[0]->id);
        $this->assertEquals(3335, $payerShare['shareYen']);

        $otherShares = collect($shares)->where('memberId', '!=', $members[0]->id);
        foreach ($otherShares as $s) {
            $this->assertEquals(3333, $s['shareYen']);
        }

        // Verify sum = amountYen
        $sum = collect($shares)->sum('shareYen');
        $this->assertEquals(10001, $sum);

        $log = OperationLog::query()
            ->where('circle_id', $circle->id)
            ->where('action', 'settlement_expense_created')
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($log);
        $this->assertEquals($expenseId, $log->meta['expenseId'] ?? null);
        $this->assertEquals(10001, $log->meta['amountInt'] ?? null);
        $this->assertNotEmpty($log->meta['request_id'] ?? null);
    }

    public function test_create_fixed_split(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 3);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => 'レンタカー',
            'amountYen' => 12000,
            'splitType' => 'fixed',
            'payerMemberId' => $members[0]->id,
            'shares' => [
                ['memberId' => $members[0]->id, 'shareYen' => 4000],
                ['memberId' => $members[1]->id, 'shareYen' => 5000],
                ['memberId' => $members[2]->id, 'shareYen' => 3000],
            ],
        ]);

        $response->assertStatus(201);
        $expense = $response->json('success.data.expense');
        $this->assertEquals('fixed', $expense['splitType']);
        $this->assertCount(3, $expense['shares']);

        $s0 = collect($expense['shares'])->firstWhere('memberId', $members[0]->id);
        $this->assertEquals(4000, $s0['shareYen']);
    }

    public function test_create_fixed_sum_mismatch_returns_422(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => '不一致',
            'amountYen' => 10000,
            'splitType' => 'fixed',
            'payerMemberId' => $members[0]->id,
            'shares' => [
                ['memberId' => $members[0]->id, 'shareYen' => 3000],
                ['memberId' => $members[1]->id, 'shareYen' => 3000],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_create_duplicate_participants_returns_422(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => '重複',
            'amountYen' => 2000,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[0]->id, $members[1]->id],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_member_cannot_create_expense(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        // profiles[1] is a member (not owner/admin)
        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => '禁止',
            'amountYen' => 1000,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[1]->id],
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_create_expense_updates_balances(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        // Create expense via API
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => '食事',
            'amountYen' => 4000,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[1]->id],
        ])->assertStatus(201);

        // Check balances
        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/balances");

        $response->assertStatus(200);
        $items = $response->json('success.data.items');

        $m0 = collect($items)->firstWhere('memberId', $members[0]->id);
        $this->assertEquals(4000, $m0['paidYen']);
        $this->assertEquals(2000, $m0['owedYen']);
        $this->assertEquals(2000, $m0['netYen']);

        $m1 = collect($items)->firstWhere('memberId', $members[1]->id);
        $this->assertEquals(-2000, $m1['netYen']);
    }

    // ═══════════════════════════════════════════════════════════════
    // Void / Replace tests (PR-D)
    // ═══════════════════════════════════════════════════════════════

    public function test_void_expense(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        // Create via API
        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => '取消対象',
            'amountYen' => 2000,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[1]->id],
        ]);
        $create->assertStatus(201);
        $expenseId = $create->json('success.data.expense.id');

        // Void it
        $void = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses/{$expenseId}/void", [
            'reason' => '金額誤り',
        ]);

        $void->assertStatus(200);
        $voided = $void->json('success.data.voided');
        $this->assertEquals('void', $voided['status']);
        $this->assertNotNull($voided['voidedAt']);
        $this->assertEquals($members[0]->id, $voided['voidedByMemberId']);

        $log = OperationLog::query()
            ->where('circle_id', $circle->id)
            ->where('action', 'settlement_expense_voided')
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($log);
        $this->assertEquals($expenseId, $log->meta['expenseId'] ?? null);
        $this->assertEquals(false, $log->meta['hasReplacement'] ?? null);
        $this->assertNotEmpty($log->meta['request_id'] ?? null);

        // Balances should be empty (no active expenses)
        $balances = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/balances");
        $this->assertEquals(0, $balances->json('success.data.totals.expenseCount'));
    }

    public function test_void_already_voided_returns_409(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => '重複void',
            'amountYen' => 1000,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[1]->id],
        ]);
        $expenseId = $create->json('success.data.expense.id');

        // First void
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses/{$expenseId}/void")
            ->assertStatus(200);

        // Second void → 409
        $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses/{$expenseId}/void")
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'ALREADY_VOIDED');
    }

    public function test_void_and_replace_linkage(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 3);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => '旧ランチ',
            'amountYen' => 3000,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[1]->id, $members[2]->id],
        ]);
        $oldId = $create->json('success.data.expense.id');

        // Void + replace
        $voidReplace = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses/{$oldId}/void", [
            'reason' => '金額修正',
            'replace' => [
                'title' => '新ランチ',
                'amountYen' => 3500,
                'splitType' => 'equal',
                'payerMemberId' => $members[0]->id,
                'participants' => [$members[0]->id, $members[1]->id, $members[2]->id],
            ],
        ]);

        $voidReplace->assertStatus(200);

        $voided = $voidReplace->json('success.data.voided');
        $replacement = $voidReplace->json('success.data.replacement');

        // Old is void with linkage to new
        $this->assertEquals('void', $voided['status']);
        $this->assertEquals($replacement['id'], $voided['replacedByExpenseId']);

        // New is active with linkage to old
        $this->assertEquals('active', $replacement['status']);
        $this->assertEquals($oldId, $replacement['replacesExpenseId']);
        $this->assertEquals('新ランチ', $replacement['title']);
        $this->assertEquals(3500, $replacement['amountYen']);

        // Balances should only reflect the replacement
        $balances = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->getJson("/api/circles/{$circle->id}/settlements/balances");

        $this->assertEquals(3500, $balances->json('success.data.totals.totalExpensesYen'));
        $this->assertEquals(1, $balances->json('success.data.totals.expenseCount'));

        $voidLog = OperationLog::query()
            ->where('circle_id', $circle->id)
            ->where('action', 'settlement_expense_voided')
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($voidLog);
        $this->assertEquals($oldId, $voidLog->meta['expenseId'] ?? null);
        $this->assertEquals(true, $voidLog->meta['hasReplacement'] ?? null);

        $replaceLog = OperationLog::query()
            ->where('circle_id', $circle->id)
            ->where('action', 'settlement_expense_replaced')
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($replaceLog);
        $this->assertEquals($oldId, $replaceLog->meta['expenseId'] ?? null);
        $this->assertEquals($replacement['id'], $replaceLog->meta['replacementExpenseId'] ?? null);
        $this->assertNotEmpty($replaceLog->meta['request_id'] ?? null);
    }

    public function test_member_cannot_void(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $create = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => 'テスト',
            'amountYen' => 1000,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[1]->id],
        ]);
        $expenseId = $create->json('success.data.expense.id');

        // Member (not admin) tries to void
        $this->withHeaders([
            'X-Device-Id' => $profiles[1]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses/{$expenseId}/void")
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_snapshot_names_preserved(): void
    {
        [$circle, $members, $profiles] = $this->createCircleWithMembers('plus', 2);

        $response = $this->withHeaders([
            'X-Device-Id' => $profiles[0]->device_id,
        ])->postJson("/api/circles/{$circle->id}/settlements/expenses", [
            'title' => 'スナップショット',
            'amountYen' => 2000,
            'splitType' => 'equal',
            'payerMemberId' => $members[0]->id,
            'participants' => [$members[0]->id, $members[1]->id],
        ]);

        $response->assertStatus(201);
        $shares = $response->json('success.data.expense.shares');

        $s0 = collect($shares)->firstWhere('memberId', $members[0]->id);
        $this->assertEquals('メンバー0', $s0['memberSnapshotName']);

        $s1 = collect($shares)->firstWhere('memberId', $members[1]->id);
        $this->assertEquals('メンバー1', $s1['memberSnapshotName']);
    }
}
