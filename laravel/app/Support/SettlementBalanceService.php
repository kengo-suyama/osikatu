<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\CircleMember;
use App\Models\CircleSettlementExpense;
use App\Models\CircleSettlementExpenseShare;

class SettlementBalanceService
{
    /**
     * Calculate balances for all members involved in active expenses.
     *
     * @return array{items: array, totals: array}
     */
    public static function balances(int $circleId): array
    {
        $activeExpenses = CircleSettlementExpense::query()
            ->where('circle_id', $circleId)
            ->where('status', 'active')
            ->get();

        $expenseIds = $activeExpenses->pluck('id')->all();

        $shares = CircleSettlementExpenseShare::query()
            ->whereIn('expense_id', $expenseIds)
            ->get();

        // paid: sum of amount_yen per payer_member_id
        $paid = [];
        foreach ($activeExpenses as $expense) {
            $pid = $expense->payer_member_id;
            $paid[$pid] = ($paid[$pid] ?? 0) + $expense->amount_yen;
        }

        // owed: sum of share_yen per member_id
        $owed = [];
        foreach ($shares as $share) {
            $mid = $share->member_id;
            $owed[$mid] = ($owed[$mid] ?? 0) + $share->share_yen;
        }

        // All unique member IDs involved
        $allMemberIds = array_values(array_unique(array_merge(array_keys($paid), array_keys($owed))));
        sort($allMemberIds);

        // Load member display names
        $members = CircleMember::query()
            ->whereIn('id', $allMemberIds)
            ->with('meProfile')
            ->get()
            ->keyBy('id');

        $items = [];
        foreach ($allMemberIds as $memberId) {
            $p = $paid[$memberId] ?? 0;
            $o = $owed[$memberId] ?? 0;
            $member = $members->get($memberId);

            $items[] = [
                'memberId' => $memberId,
                'displayName' => $member?->meProfile?->nickname ?? ('Member #' . $memberId),
                'paidYen' => $p,
                'owedYen' => $o,
                'netYen' => $p - $o,
            ];
        }

        return [
            'items' => $items,
            'totals' => [
                'totalExpensesYen' => $activeExpenses->sum('amount_yen'),
                'expenseCount' => $activeExpenses->count(),
            ],
        ];
    }

    /**
     * Generate settlement suggestions using greedy algorithm.
     * Deterministic: same-amount ties broken by memberId ascending.
     *
     * @return array{items: array, generatedAt: string}
     */
    public static function suggestions(int $circleId): array
    {
        $balanceData = self::balances($circleId);

        $debtors = [];
        $creditors = [];

        foreach ($balanceData['items'] as $item) {
            if ($item['netYen'] < 0) {
                $debtors[] = ['memberId' => $item['memberId'], 'amount' => -$item['netYen']];
            } elseif ($item['netYen'] > 0) {
                $creditors[] = ['memberId' => $item['memberId'], 'amount' => $item['netYen']];
            }
        }

        // Sort descending by amount, then ascending by memberId for determinism
        usort($debtors, fn($a, $b) => $b['amount'] <=> $a['amount'] ?: $a['memberId'] <=> $b['memberId']);
        usort($creditors, fn($a, $b) => $b['amount'] <=> $a['amount'] ?: $a['memberId'] <=> $b['memberId']);

        $suggestions = [];
        $i = 0;
        $j = 0;

        while ($i < count($debtors) && $j < count($creditors)) {
            $transfer = min($debtors[$i]['amount'], $creditors[$j]['amount']);
            if ($transfer > 0) {
                $suggestions[] = [
                    'fromMemberId' => $debtors[$i]['memberId'],
                    'toMemberId' => $creditors[$j]['memberId'],
                    'amountYen' => $transfer,
                ];
            }
            $debtors[$i]['amount'] -= $transfer;
            $creditors[$j]['amount'] -= $transfer;
            if ($debtors[$i]['amount'] === 0) {
                $i++;
            }
            if ($creditors[$j]['amount'] === 0) {
                $j++;
            }
        }

        return [
            'items' => $suggestions,
            'generatedAt' => now()->toIso8601String(),
        ];
    }
}
