<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleSettlementExpense;
use App\Support\ApiResponse;
use App\Support\MeProfileResolver;
use App\Support\PlanGate;
use App\Support\SettlementBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CircleSettlementExpenseController extends Controller
{
    public function index(Request $request, int $circle): JsonResponse
    {
        $guard = $this->requireMember($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $query = CircleSettlementExpense::query()
            ->where('circle_id', $circle)
            ->where('status', 'active')
            ->with('shares')
            ->orderByDesc('occurred_on')
            ->orderByDesc('id');

        if ($request->has('from')) {
            $query->where('occurred_on', '>=', $request->query('from'));
        }
        if ($request->has('to')) {
            $query->where('occurred_on', '<=', $request->query('to'));
        }

        $limit = min((int) ($request->query('limit', '50')), 100);
        $items = $query->limit($limit)->get();

        return ApiResponse::success([
            'items' => $items->map(fn(CircleSettlementExpense $e) => self::mapExpense($e))->values(),
            'nextCursor' => null,
        ]);
    }

    public function balances(Request $request, int $circle): JsonResponse
    {
        $guard = $this->requireMember($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        return ApiResponse::success(SettlementBalanceService::balances($circle));
    }

    public function suggestions(Request $request, int $circle): JsonResponse
    {
        $guard = $this->requireMember($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        return ApiResponse::success(SettlementBalanceService::suggestions($circle));
    }

    private function requireMember(Request $request, int $circleId): array|JsonResponse
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
        }

        $circle = Circle::query()->where('id', $circleId)->first();
        if (!$circle) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        if (!PlanGate::circleHasPlus($circle)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required for settlement expenses.', null, 403);
        }

        $meProfile = MeProfileResolver::resolve($deviceId);
        if (!$meProfile) {
            return ApiResponse::error('PROFILE_NOT_FOUND', 'Me profile not found', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('me_profile_id', $meProfile->id)
            ->first();

        if (!$member) {
            return ApiResponse::error('NOT_FOUND', 'Not a circle member.', null, 404);
        }

        return [
            'circle' => $circle,
            'member' => $member,
        ];
    }

    private static function mapExpense(CircleSettlementExpense $expense): array
    {
        return [
            'id' => $expense->id,
            'circleId' => $expense->circle_id,
            'createdBy' => $expense->created_by,
            'payerMemberId' => $expense->payer_member_id,
            'title' => $expense->title,
            'amountYen' => (int) $expense->amount_yen,
            'splitType' => $expense->split_type,
            'occurredOn' => $expense->occurred_on?->toDateString(),
            'note' => $expense->note,
            'status' => $expense->status,
            'replacedByExpenseId' => $expense->replaced_by_expense_id,
            'replacesExpenseId' => $expense->replaces_expense_id,
            'shares' => $expense->shares->map(fn($s) => [
                'memberId' => $s->member_id,
                'memberSnapshotName' => $s->member_snapshot_name,
                'shareYen' => (int) $s->share_yen,
            ])->values(),
            'createdAt' => $expense->created_at?->toIso8601String(),
        ];
    }
}
