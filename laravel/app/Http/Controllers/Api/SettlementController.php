<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\Settlement;
use App\Models\SettlementParticipant;
use App\Models\SettlementTransfer;
use App\Support\ApiResponse;
use App\Support\MeProfileResolver;
use App\Support\OperationLogService;
use App\Support\PlanGate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SettlementController extends Controller
{
    public function index(Request $request, int $circle)
    {
        $guard = $this->requireOwnerAdmin($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $limit = min(50, max(1, (int) ($request->query('limit') ?? 30)));
        $cursor = $request->query('cursor');

        $query = Settlement::query()
            ->where('circle_id', $circle)
            ->withCount(['participants', 'transfers'])
            ->orderByDesc('settled_at')
            ->orderByDesc('id');

        if ($cursor && is_string($cursor) && ctype_digit($cursor)) {
            $query->where('id', '<', (int) $cursor);
        }

        $items = $query->limit($limit + 1)->get();
        $hasMore = $items->count() > $limit;
        $slice = $items->take($limit);
        $nextCursor = null;
        if ($hasMore && $slice->count() > 0) {
            $nextCursor = (string) $slice->last()->id;
        }

        $members = CircleMember::query()
            ->where('circle_id', $circle)
            ->with('meProfile')
            ->get();

        return ApiResponse::success([
            'items' => $slice->map(fn(Settlement $settlement) => $this->mapSettlementSummary($settlement))->values(),
            'members' => $members->map(fn(CircleMember $member) => $this->buildMemberBrief($member))->values(),
            'nextCursor' => $nextCursor,
        ]);
    }

    public function show(Request $request, int $circle, int $settlement)
    {
        $guard = $this->requireOwnerAdmin($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $model = Settlement::query()
            ->where('circle_id', $circle)
            ->where('id', $settlement)
            ->with(['participants', 'transfers'])
            ->first();

        if (!$model) {
            return ApiResponse::error('NOT_FOUND', 'Settlement not found.', null, 404);
        }

        return ApiResponse::success($this->mapSettlementDetail($model));
    }

    public function store(Request $request, int $circle)
    {
        $guard = $this->requireOwnerAdmin($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:80'],
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'participantUserIds' => ['required', 'array', 'min:1', 'max:50'],
            'participantUserIds.*' => ['integer'],
            'splitMode' => ['required', 'in:equal'],
            'settledAt' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $member = $guard['member'];

        $participantUserIds = array_values(array_unique($data['participantUserIds'] ?? []));
        if (!in_array($member->user_id, $participantUserIds, true)) {
            $participantUserIds[] = $member->user_id;
        }

        $participantUserIds = array_values(array_unique($participantUserIds));
        if (empty($participantUserIds)) {
            return ApiResponse::error('VALIDATION_ERROR', 'Participants required', [
                'participantUserIds' => ['At least one participant is required.'],
            ], 422);
        }

        $validUserIds = CircleMember::query()
            ->where('circle_id', $circle)
            ->whereIn('user_id', $participantUserIds)
            ->pluck('user_id')
            ->all();

        if (count($validUserIds) !== count($participantUserIds)) {
            return ApiResponse::error('VALIDATION_ERROR', 'Invalid participants', [
                'participantUserIds' => ['Participants must belong to circle.'],
            ], 422);
        }

        $amountInt = (int) $data['amount'];
        $participantCount = count($participantUserIds);
        $share = (int) ceil($amountInt / max(1, $participantCount));
        $diff = $share * $participantCount - $amountInt;
        $payerShare = max(0, $share - $diff);
        $splitMode = 'equal';
        $settledAt = $data['settledAt'] ?? null;

        $settlement = DB::transaction(function () use (
            $circle,
            $member,
            $data,
            $participantUserIds,
            $share,
            $payerShare,
            $amountInt,
            $splitMode,
            $settledAt
        ) {
            $model = Settlement::create([
                'circle_id' => $circle,
                'created_by' => $member->user_id,
                'title' => $data['title'],
                'amount_int' => $amountInt,
                'currency' => 'JPY',
                'settled_at' => $settledAt,
            ]);

            foreach ($participantUserIds as $participantUserId) {
                SettlementParticipant::create([
                    'settlement_id' => $model->id,
                    'user_id' => $participantUserId,
                    'share_int' => $participantUserId === $member->user_id ? $payerShare : $share,
                    'is_payer' => $participantUserId === $member->user_id,
                ]);
            }

            foreach ($participantUserIds as $participantUserId) {
                if ($participantUserId === $member->user_id) {
                    continue;
                }
                SettlementTransfer::create([
                    'settlement_id' => $model->id,
                    'from_user_id' => $participantUserId,
                    'to_user_id' => $member->user_id,
                    'amount_int' => $share,
                    'status' => 'pending',
                ]);
            }

            return $model;
        });

        $settlement->load(['participants', 'transfers']);

        OperationLogService::log($request, 'settlement.create', $circle, [
            'circleId' => $circle,
            'settlementId' => $settlement->id,
            'participantCount' => $participantCount,
            'transferCount' => $settlement->transfers->count(),
            'amountInt' => $amountInt,
            'splitMode' => $splitMode,
        ]);

        return ApiResponse::success($this->mapSettlementDetail($settlement), null, 201);
    }

    public function update(Request $request, int $circle, int $settlement)
    {
        $guard = $this->requireOwnerAdmin($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $model = Settlement::query()
            ->where('circle_id', $circle)
            ->where('id', $settlement)
            ->first();

        if (!$model) {
            return ApiResponse::error('NOT_FOUND', 'Settlement not found.', null, 404);
        }

        $validator = Validator::make($request->all(), [
            'paidTransferIds' => ['required', 'array', 'min:1', 'max:50'],
            'paidTransferIds.*' => ['integer'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $ids = array_values(array_unique($validator->validated()['paidTransferIds'] ?? []));
        if (empty($ids)) {
            return ApiResponse::error('VALIDATION_ERROR', 'Transfers required', [
                'paidTransferIds' => ['At least one transfer id is required.'],
            ], 422);
        }

        $transfers = SettlementTransfer::query()
            ->where('settlement_id', $model->id)
            ->whereIn('id', $ids)
            ->get();

        if ($transfers->isEmpty()) {
            return ApiResponse::error('NOT_FOUND', 'Transfers not found.', null, 404);
        }

        $updatedCount = SettlementTransfer::query()
            ->whereIn('id', $transfers->pluck('id')->all())
            ->update(['status' => 'paid']);

        OperationLogService::log($request, 'settlement.update', $circle, [
            'circleId' => $circle,
            'settlementId' => $model->id,
            'transferCount' => $updatedCount,
        ]);

        return ApiResponse::success([
            'updated' => true,
            'paidTransferCount' => $updatedCount,
        ]);
    }

    private function requireOwnerAdmin(Request $request, int $circle): array|JsonResponse
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
        }

        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        if ($deny = PlanGate::requireCirclePlus($circleModel, 'Plus plan required for settlements.')) {
            return $deny;
        }

        $meProfile = MeProfileResolver::resolve($deviceId);
        if (!$meProfile) {
            return ApiResponse::error('PROFILE_NOT_FOUND', 'Me profile not found', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circle)
            ->where('me_profile_id', $meProfile->id)
            ->first();

        if (!$member || !in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only', null, 403);
        }

        return [
            'circle' => $circleModel,
            'member' => $member,
        ];
    }

    private function buildMemberBrief(CircleMember $member): array
    {
        $profile = $member->meProfile;

        return [
            'id' => $member->id,
            'userId' => $member->user_id,
            'nickname' => $profile?->nickname,
            'avatarUrl' => $profile?->avatar_url,
            'initial' => $profile?->initial,
            'role' => $member->role ?? 'member',
        ];
    }

    private function mapSettlementSummary(Settlement $settlement): array
    {
        return [
            'id' => $settlement->id,
            'circleId' => $settlement->circle_id,
            'title' => $settlement->title,
            'amount' => (int) $settlement->amount_int,
            'currency' => $settlement->currency ?? 'JPY',
            'settledAt' => $settlement->settled_at?->toDateString(),
            'splitMode' => 'equal',
            'participantCount' => (int) ($settlement->participants_count ?? 0),
            'transferCount' => (int) ($settlement->transfers_count ?? 0),
            'createdByUserId' => $settlement->created_by,
            'createdAt' => $settlement->created_at?->toIso8601String(),
        ];
    }

    private function mapSettlementDetail(Settlement $settlement): array
    {
        return [
            'id' => $settlement->id,
            'circleId' => $settlement->circle_id,
            'title' => $settlement->title,
            'amount' => (int) $settlement->amount_int,
            'currency' => $settlement->currency ?? 'JPY',
            'settledAt' => $settlement->settled_at?->toDateString(),
            'splitMode' => 'equal',
            'participantCount' => $settlement->participants->count(),
            'transferCount' => $settlement->transfers->count(),
            'createdByUserId' => $settlement->created_by,
            'participants' => $settlement->participants->map(fn(SettlementParticipant $participant) => [
                'id' => $participant->id,
                'userId' => $participant->user_id,
                'shareAmount' => (int) $participant->share_int,
                'isPayer' => (bool) $participant->is_payer,
            ])->values(),
            'transfers' => $settlement->transfers->map(fn(SettlementTransfer $transfer) => [
                'id' => $transfer->id,
                'fromUserId' => $transfer->from_user_id,
                'toUserId' => $transfer->to_user_id,
                'amount' => (int) $transfer->amount_int,
                'status' => $transfer->status ?? 'pending',
            ])->values(),
            'createdAt' => $settlement->created_at?->toIso8601String(),
        ];
    }
}
