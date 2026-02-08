<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleSettlementExpense;
use App\Models\CircleSettlementExpenseShare;
use App\Support\ApiResponse;
use App\Support\MeProfileResolver;
use App\Support\OperationLogService;
use App\Support\PlanGate;
use App\Support\SettlementBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

final class ReplacePayloadValidationException extends \RuntimeException
{
    public function __construct(public readonly JsonResponse $response)
    {
        parent::__construct('Replace payload validation failed.');
    }
}

class CircleSettlementExpenseController extends Controller
{
    // ── Read endpoints (member+) ────────────────────────────────────

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

    // ── Write endpoints (owner/admin) ───────────────────────────────

    public function store(Request $request, int $circle): JsonResponse
    {
        $guard = $this->requireOwnerAdmin($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        // Support request aliases (client-side / docs) without breaking existing payloads.
        $payload = $request->all();
        if (array_key_exists('totalYen', $payload) && !array_key_exists('amountYen', $payload)) {
            $payload['amountYen'] = $payload['totalYen'];
        }
        if (array_key_exists('splitMethod', $payload) && !array_key_exists('splitType', $payload)) {
            $payload['splitType'] = $payload['splitMethod'];
        }
        if (array_key_exists('memberIds', $payload) && !array_key_exists('participants', $payload)) {
            $payload['participants'] = $payload['memberIds'];
        }
        if (isset($payload['shares']) && is_array($payload['shares'])) {
            foreach ($payload['shares'] as $index => $share) {
                if (!is_array($share)) {
                    continue;
                }
                if (array_key_exists('amountYen', $share) && !array_key_exists('shareYen', $share)) {
                    $payload['shares'][$index]['shareYen'] = $share['amountYen'];
                }
            }
        }

        $validator = Validator::make($payload, [
            'title' => ['required', 'string', 'max:255'],
            'amountYen' => ['required', 'integer', 'min:1'],
            'splitType' => ['required', 'in:equal,fixed'],
            'payerMemberId' => ['required', 'integer'],
            'occurredOn' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:2000'],
            'participants' => ['required_if:splitType,equal', 'array', 'min:1', 'max:200'],
            'participants.*' => ['integer'],
            'shares' => ['required_if:splitType,fixed', 'array', 'min:1', 'max:200'],
            'shares.*.memberId' => ['required', 'integer'],
            'shares.*.shareYen' => ['required', 'integer', 'min:0'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $member = $guard['member'];
        $circleId = $circle;

        // Validate payer is a circle member
        $payerMember = CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('id', $data['payerMemberId'])
            ->with('meProfile')
            ->first();

        if (!$payerMember) {
            return ApiResponse::error('VALIDATION_ERROR', 'Payer must be a circle member', [
                'payerMemberId' => ['Payer is not a member of this circle.'],
            ], 422);
        }

        $splitType = $data['splitType'];
        $amountYen = (int) $data['amountYen'];
        $occurredOn = $data['occurredOn'] ?? now()->toDateString();

        if ($splitType === 'equal') {
            return $this->createEqualExpense($request, $circleId, $member, $payerMember, $data, $amountYen, $occurredOn);
        }

        return $this->createFixedExpense($request, $circleId, $member, $payerMember, $data, $amountYen, $occurredOn);
    }

    public function voidExpense(Request $request, int $circle, int $expense): JsonResponse
    {
        $guard = $this->requireOwnerAdmin($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $member = $guard['member'];

        $expenseModel = CircleSettlementExpense::query()
            ->where('circle_id', $circle)
            ->where('id', $expense)
            ->first();

        if (!$expenseModel) {
            return ApiResponse::error('NOT_FOUND', 'Expense not found.', null, 404);
        }

        if ($expenseModel->status === 'void') {
            return ApiResponse::error('ALREADY_VOIDED', 'Expense is already voided.', null, 409);
        }

        $replaceData = $request->input('replace');
        if (!$replaceData && $request->has('replacePayload')) {
            $replaceData = $request->input('replacePayload');
        }

        try {
            $result = DB::transaction(function () use ($expenseModel, $member, $circle, $replaceData) {
                // Void the expense
                $expenseModel->update([
                    'status' => 'void',
                    'voided_at' => now(),
                    'voided_by_member_id' => $member->id,
                ]);

                $newExpense = null;

                if ($replaceData && is_array($replaceData)) {
                    // Create replacement expense via a nested store-like flow
                    $newExpense = $this->createReplacementExpense($circle, $member, $replaceData, $expenseModel->id);

                    if ($newExpense instanceof JsonResponse) {
                        // Validation error in replacement — abort transaction
                        throw new ReplacePayloadValidationException($newExpense);
                    }

                    // Set linkage
                    $expenseModel->update(['replaced_by_expense_id' => $newExpense->id]);
                }

                return [
                    'voided' => $expenseModel->fresh()->load('shares'),
                    'replacement' => $newExpense?->load('shares'),
                ];
            });
        } catch (ReplacePayloadValidationException $e) {
            return $e->response;
        }

        $response = [
            'voided' => self::mapExpense($result['voided']),
        ];

        if ($result['replacement']) {
            $response['replacement'] = self::mapExpense($result['replacement']);
        }

        OperationLogService::log($request, 'settlement_expense_voided', $circle, [
            'circleId' => $circle,
            'expenseId' => $expense,
            'hasReplacement' => (bool) $result['replacement'],
            'request_id' => (string) ($request->header('X-Request-Id') ?? ''),
        ]);

        if ($result['replacement']) {
            OperationLogService::log($request, 'settlement_expense_replaced', $circle, [
                'circleId' => $circle,
                'expenseId' => $expense,
                'replacementExpenseId' => $result['replacement']->id,
                'request_id' => (string) ($request->header('X-Request-Id') ?? ''),
            ]);
        }

        return ApiResponse::success($response);
    }

    // ── Equal split logic ───────────────────────────────────────────

    private function createEqualExpense(
        Request $request,
        int $circleId,
        CircleMember $creator,
        CircleMember $payer,
        array $data,
        int $amountYen,
        string $occurredOn,
    ): JsonResponse {
        $participantIds = array_values(array_unique($data['participants'] ?? []));

        if (count($participantIds) !== count($data['participants'] ?? [])) {
            return ApiResponse::error('VALIDATION_ERROR', 'Duplicate participants', [
                'participants' => ['Participants must not contain duplicates.'],
            ], 422);
        }

        // Ensure payer is included
        if (!in_array($payer->id, $participantIds, true)) {
            $participantIds[] = $payer->id;
        }

        // Validate all participants are circle members
        $members = CircleMember::query()
            ->where('circle_id', $circleId)
            ->whereIn('id', $participantIds)
            ->with('meProfile')
            ->get()
            ->keyBy('id');

        if ($members->count() !== count($participantIds)) {
            return ApiResponse::error('VALIDATION_ERROR', 'Invalid participants', [
                'participants' => ['All participants must be members of this circle.'],
            ], 422);
        }

        $n = count($participantIds);
        $base = (int) floor($amountYen / $n);
        $remainder = $amountYen - $base * $n;

        $expense = DB::transaction(function () use (
            $circleId, $creator, $payer, $data, $amountYen, $occurredOn,
            $participantIds, $members, $base, $remainder,
        ) {
            $expense = CircleSettlementExpense::create([
                'circle_id' => $circleId,
                'created_by' => $creator->id,
                'payer_member_id' => $payer->id,
                'title' => $data['title'],
                'amount_yen' => $amountYen,
                'split_type' => 'equal',
                'occurred_on' => $occurredOn,
                'note' => $data['note'] ?? null,
                'status' => 'active',
            ]);

            foreach ($participantIds as $pid) {
                $m = $members->get($pid);
                $share = $pid === $payer->id ? $base + $remainder : $base;

                CircleSettlementExpenseShare::create([
                    'expense_id' => $expense->id,
                    'member_id' => $pid,
                    'member_snapshot_name' => $m?->meProfile?->nickname ?? ('Member #' . $pid),
                    'share_yen' => $share,
                    'created_at' => now(),
                ]);
            }

            return $expense;
        });

        $expense->load('shares');

        OperationLogService::log($request, 'settlement_expense_created', $circleId, [
            'circleId' => $circleId,
            'expenseId' => $expense->id,
            'amountInt' => $amountYen,
            'participantCount' => $expense->shares->count(),
            'splitMode' => 'equal',
            'request_id' => (string) ($request->header('X-Request-Id') ?? ''),
        ]);

        return ApiResponse::success([
            'expense' => self::mapExpense($expense),
        ], null, 201);
    }

    // ── Fixed split logic ───────────────────────────────────────────

    private function createFixedExpense(
        Request $request,
        int $circleId,
        CircleMember $creator,
        CircleMember $payer,
        array $data,
        int $amountYen,
        string $occurredOn,
    ): JsonResponse {
        $sharesInput = $data['shares'] ?? [];

        // Check for duplicate member IDs
        $memberIds = array_column($sharesInput, 'memberId');
        if (count($memberIds) !== count(array_unique($memberIds))) {
            return ApiResponse::error('VALIDATION_ERROR', 'Duplicate shares', [
                'shares' => ['Each member may appear only once in shares.'],
            ], 422);
        }

        // Validate sum == amountYen
        $sum = array_sum(array_column($sharesInput, 'shareYen'));
        if ($sum !== $amountYen) {
            return ApiResponse::error('VALIDATION_ERROR', 'Shares sum mismatch', [
                'shares' => ["Shares total ({$sum}) must equal amountYen ({$amountYen})."],
            ], 422);
        }

        // Validate all members exist in circle
        $members = CircleMember::query()
            ->where('circle_id', $circleId)
            ->whereIn('id', $memberIds)
            ->with('meProfile')
            ->get()
            ->keyBy('id');

        if ($members->count() !== count($memberIds)) {
            return ApiResponse::error('VALIDATION_ERROR', 'Invalid shares members', [
                'shares' => ['All share members must belong to this circle.'],
            ], 422);
        }

        $expense = DB::transaction(function () use (
            $circleId, $creator, $payer, $data, $amountYen, $occurredOn,
            $sharesInput, $members,
        ) {
            $expense = CircleSettlementExpense::create([
                'circle_id' => $circleId,
                'created_by' => $creator->id,
                'payer_member_id' => $payer->id,
                'title' => $data['title'],
                'amount_yen' => $amountYen,
                'split_type' => 'fixed',
                'occurred_on' => $occurredOn,
                'note' => $data['note'] ?? null,
                'status' => 'active',
            ]);

            foreach ($sharesInput as $s) {
                $m = $members->get($s['memberId']);
                CircleSettlementExpenseShare::create([
                    'expense_id' => $expense->id,
                    'member_id' => $s['memberId'],
                    'member_snapshot_name' => $m?->meProfile?->nickname ?? ('Member #' . $s['memberId']),
                    'share_yen' => $s['shareYen'],
                    'created_at' => now(),
                ]);
            }

            return $expense;
        });

        $expense->load('shares');

        OperationLogService::log($request, 'settlement_expense_created', $circleId, [
            'circleId' => $circleId,
            'expenseId' => $expense->id,
            'amountInt' => $amountYen,
            'participantCount' => $expense->shares->count(),
            'splitMode' => 'fixed',
            'request_id' => (string) ($request->header('X-Request-Id') ?? ''),
        ]);

        return ApiResponse::success([
            'expense' => self::mapExpense($expense),
        ], null, 201);
    }

    // ── Replacement helper (for void+replace) ───────────────────────

    private function createReplacementExpense(
        int $circleId,
        CircleMember $creator,
        array $data,
        int $replacesExpenseId,
    ): CircleSettlementExpense|JsonResponse {
        // Minimal validation for replace payload
        $validator = Validator::make($data, [
            'title' => ['required', 'string', 'max:255'],
            'amountYen' => ['required', 'integer', 'min:1'],
            'splitType' => ['required', 'in:equal,fixed'],
            'payerMemberId' => ['required', 'integer'],
            'occurredOn' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:2000'],
            'participants' => ['required_if:splitType,equal', 'array', 'min:1', 'max:200'],
            'participants.*' => ['integer'],
            'shares' => ['required_if:splitType,fixed', 'array', 'min:1', 'max:200'],
            'shares.*.memberId' => ['required', 'integer'],
            'shares.*.shareYen' => ['required', 'integer', 'min:0'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Replace payload validation failed', $validator->errors(), 422);
        }

        $vData = $validator->validated();
        $amountYen = (int) $vData['amountYen'];
        $occurredOn = $vData['occurredOn'] ?? now()->toDateString();

        $payerMember = CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('id', $vData['payerMemberId'])
            ->with('meProfile')
            ->first();

        if (!$payerMember) {
            return ApiResponse::error('VALIDATION_ERROR', 'Replace payer must be a circle member', null, 422);
        }

        if ($vData['splitType'] === 'equal') {
            $participantIds = array_values(array_unique($vData['participants'] ?? []));
            if (!in_array($payerMember->id, $participantIds, true)) {
                $participantIds[] = $payerMember->id;
            }

            $members = CircleMember::query()
                ->where('circle_id', $circleId)
                ->whereIn('id', $participantIds)
                ->with('meProfile')
                ->get()
                ->keyBy('id');

            if ($members->count() !== count($participantIds)) {
                return ApiResponse::error('VALIDATION_ERROR', 'Invalid replace participants', null, 422);
            }

            $n = count($participantIds);
            $base = (int) floor($amountYen / $n);
            $remainder = $amountYen - $base * $n;

            $expense = CircleSettlementExpense::create([
                'circle_id' => $circleId,
                'created_by' => $creator->id,
                'payer_member_id' => $payerMember->id,
                'title' => $vData['title'],
                'amount_yen' => $amountYen,
                'split_type' => 'equal',
                'occurred_on' => $occurredOn,
                'note' => $vData['note'] ?? null,
                'status' => 'active',
                'replaces_expense_id' => $replacesExpenseId,
            ]);

            foreach ($participantIds as $pid) {
                $m = $members->get($pid);
                $share = $pid === $payerMember->id ? $base + $remainder : $base;
                CircleSettlementExpenseShare::create([
                    'expense_id' => $expense->id,
                    'member_id' => $pid,
                    'member_snapshot_name' => $m?->meProfile?->nickname ?? ('Member #' . $pid),
                    'share_yen' => $share,
                    'created_at' => now(),
                ]);
            }

            return $expense;
        }

        // Fixed split for replacement
        $sharesInput = $vData['shares'] ?? [];
        $memberIds = array_column($sharesInput, 'memberId');
        $sum = array_sum(array_column($sharesInput, 'shareYen'));

        if ($sum !== $amountYen) {
            return ApiResponse::error('VALIDATION_ERROR', 'Replace shares sum mismatch', null, 422);
        }

        $members = CircleMember::query()
            ->where('circle_id', $circleId)
            ->whereIn('id', $memberIds)
            ->with('meProfile')
            ->get()
            ->keyBy('id');

        if ($members->count() !== count($memberIds)) {
            return ApiResponse::error('VALIDATION_ERROR', 'Invalid replace share members', null, 422);
        }

        $expense = CircleSettlementExpense::create([
            'circle_id' => $circleId,
            'created_by' => $creator->id,
            'payer_member_id' => $payerMember->id,
            'title' => $vData['title'],
            'amount_yen' => $amountYen,
            'split_type' => 'fixed',
            'occurred_on' => $occurredOn,
            'note' => $vData['note'] ?? null,
            'status' => 'active',
            'replaces_expense_id' => $replacesExpenseId,
        ]);

        foreach ($sharesInput as $s) {
            $m = $members->get($s['memberId']);
            CircleSettlementExpenseShare::create([
                'expense_id' => $expense->id,
                'member_id' => $s['memberId'],
                'member_snapshot_name' => $m?->meProfile?->nickname ?? ('Member #' . $s['memberId']),
                'share_yen' => $s['shareYen'],
                'created_at' => now(),
            ]);
        }

        return $expense;
    }

    // ── Guards ───────────────────────────────────────────────────────

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
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required for settlement expenses.', [
                'requiredPlan' => 'plus',
            ], 402);
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

    private function requireOwnerAdmin(Request $request, int $circleId): array|JsonResponse
    {
        $result = $this->requireMember($request, $circleId);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        if (!in_array($result['member']->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only', null, 403);
        }

        return $result;
    }

    // ── Mapper ──────────────────────────────────────────────────────

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
            'voidedAt' => $expense->voided_at?->toIso8601String(),
            'voidedByMemberId' => $expense->voided_by_member_id,
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
