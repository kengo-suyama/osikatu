<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleSchedule;
use App\Models\CircleScheduleParticipant;
use App\Models\CircleScheduleProposal;
use App\Models\MeProfile;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CircleScheduleProposalController extends Controller
{
    // ── Create proposal (any circle member) ─────────────────────────

    public function store(Request $request, int $circle): JsonResponse
    {
        $guard = $this->requireMember($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:120'],
            'startAt' => ['required', 'date'],
            'endAt' => ['nullable', 'date', 'after_or_equal:startAt'],
            'isAllDay' => ['nullable', 'boolean'],
            'note' => ['nullable', 'string', 'max:2000'],
            'location' => ['nullable', 'string', 'max:120'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $member = $guard['member'];

        $proposal = CircleScheduleProposal::create([
            'circle_id' => $circle,
            'created_by_member_id' => $member->id,
            'title' => $data['title'],
            'start_at' => $data['startAt'],
            'end_at' => $data['endAt'] ?? $data['startAt'],
            'is_all_day' => (bool) ($data['isAllDay'] ?? false),
            'note' => $data['note'] ?? null,
            'location' => $data['location'] ?? null,
            'status' => 'pending',
        ]);

        return ApiResponse::success([
            'proposal' => self::mapProposal($proposal),
        ], null, 201);
    }

    // ── List proposals (owner/admin + plus) ─────────────────────────

    public function index(Request $request, int $circle): JsonResponse
    {
        $guard = $this->requireOwnerAdmin($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $status = $request->query('status');
        $limit = min((int) ($request->query('limit') ?? 50), 100);

        $query = CircleScheduleProposal::query()
            ->where('circle_id', $circle)
            ->orderByDesc('created_at')
            ->limit($limit);

        if ($status && in_array($status, ['pending', 'approved', 'rejected', 'canceled'], true)) {
            $query->where('status', $status);
        }

        $items = $query->get();

        return ApiResponse::success([
            'items' => $items->map(fn ($p) => self::mapProposal($p))->values(),
        ]);
    }

    // ── My proposals (any circle member) ────────────────────────────

    public function mine(Request $request, int $circle): JsonResponse
    {
        $guard = $this->requireMember($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $member = $guard['member'];
        $status = $request->query('status');
        $limit = min((int) ($request->query('limit') ?? 50), 100);

        $query = CircleScheduleProposal::query()
            ->where('circle_id', $circle)
            ->where('created_by_member_id', $member->id)
            ->orderByDesc('created_at')
            ->limit($limit);

        if ($status && in_array($status, ['pending', 'approved', 'rejected', 'canceled'], true)) {
            $query->where('status', $status);
        }

        $items = $query->get();

        return ApiResponse::success([
            'items' => $items->map(fn ($p) => self::mapProposal($p))->values(),
        ]);
    }

    // ── Approve proposal (owner/admin + plus) ───────────────────────

    public function approve(Request $request, int $circle, int $proposal): JsonResponse
    {
        $guard = $this->requireOwnerAdmin($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $proposalModel = CircleScheduleProposal::query()
            ->where('circle_id', $circle)
            ->where('id', $proposal)
            ->first();

        if (!$proposalModel) {
            return ApiResponse::error('NOT_FOUND', 'Proposal not found.', null, 404);
        }

        if ($proposalModel->status !== 'pending') {
            return ApiResponse::error('ALREADY_REVIEWED', 'Proposal has already been reviewed.', null, 409);
        }

        $member = $guard['member'];
        $reviewComment = $request->input('comment');

        // Create the actual schedule
        $schedule = CircleSchedule::create([
            'circle_id' => $circle,
            'created_by' => $member->meProfile?->user_id ?? $member->user_id,
            'title' => $proposalModel->title,
            'start_at' => $proposalModel->start_at,
            'end_at' => $proposalModel->end_at,
            'is_all_day' => $proposalModel->is_all_day,
            'note' => $proposalModel->note,
            'location' => $proposalModel->location,
            'visibility' => 'members',
        ]);

        // Add all circle members as participants
        $memberIds = CircleMember::query()
            ->where('circle_id', $circle)
            ->pluck('user_id')
            ->all();

        foreach ($memberIds as $userId) {
            CircleScheduleParticipant::create([
                'circle_schedule_id' => $schedule->id,
                'user_id' => $userId,
                'status' => 'accepted',
            ]);
        }

        // Update proposal status
        $proposalModel->update([
            'status' => 'approved',
            'reviewed_by_member_id' => $member->id,
            'reviewed_at' => now(),
            'review_comment' => $reviewComment,
            'approved_schedule_id' => $schedule->id,
        ]);

        return ApiResponse::success([
            'proposal' => self::mapProposal($proposalModel->fresh()),
            'schedule' => [
                'id' => 'cs_' . $schedule->id,
                'title' => $schedule->title,
            ],
        ]);
    }

    // ── Reject proposal (owner/admin + plus) ────────────────────────

    public function reject(Request $request, int $circle, int $proposal): JsonResponse
    {
        $guard = $this->requireOwnerAdmin($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $proposalModel = CircleScheduleProposal::query()
            ->where('circle_id', $circle)
            ->where('id', $proposal)
            ->first();

        if (!$proposalModel) {
            return ApiResponse::error('NOT_FOUND', 'Proposal not found.', null, 404);
        }

        if ($proposalModel->status !== 'pending') {
            return ApiResponse::error('ALREADY_REVIEWED', 'Proposal has already been reviewed.', null, 409);
        }

        $member = $guard['member'];
        $reviewComment = $request->input('comment');

        $proposalModel->update([
            'status' => 'rejected',
            'reviewed_by_member_id' => $member->id,
            'reviewed_at' => now(),
            'review_comment' => $reviewComment,
        ]);

        return ApiResponse::success([
            'proposal' => self::mapProposal($proposalModel->fresh()),
        ]);
    }

    // ── Guards ───────────────────────────────────────────────────────

    private function requireMember(Request $request, int $circleId): array|JsonResponse
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $circle = Circle::query()->where('id', $circleId)->first();
        if (!$circle) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $profile = MeProfile::query()->where('device_id', $deviceId)->first();
        if (!$profile || !$profile->user_id) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('user_id', $profile->user_id)
            ->first();

        if (!$member) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        return [
            'circle' => $circle,
            'member' => $member,
        ];
    }

    private function requireOwnerAdmin(Request $request, int $circleId): array|JsonResponse
    {
        $guard = $this->requireMember($request, $circleId);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $member = $guard['member'];
        $circle = $guard['circle'];
        $plan = $circle->plan ?? 'free';
        $isPremium = in_array($plan, ['premium', 'plus'], true);
        $isManager = in_array($member->role, ['owner', 'admin'], true);

        if (!$isPremium || !$isManager) {
            return ApiResponse::error('FORBIDDEN', 'Premium owner/admin only.', null, 403);
        }

        return $guard;
    }

    // ── Mapper ──────────────────────────────────────────────────────

    private static function mapProposal(CircleScheduleProposal $proposal): array
    {
        $tz = 'Asia/Tokyo';

        return [
            'id' => $proposal->id,
            'circleId' => $proposal->circle_id,
            'createdByMemberId' => $proposal->created_by_member_id,
            'title' => $proposal->title,
            'startAt' => $proposal->start_at?->setTimezone($tz)->toIso8601String(),
            'endAt' => $proposal->end_at?->setTimezone($tz)->toIso8601String(),
            'isAllDay' => (bool) $proposal->is_all_day,
            'note' => $proposal->note,
            'location' => $proposal->location,
            'status' => $proposal->status,
            'reviewedByMemberId' => $proposal->reviewed_by_member_id,
            'reviewedAt' => $proposal->reviewed_at?->setTimezone($tz)->toIso8601String(),
            'reviewComment' => $proposal->review_comment,
            'approvedScheduleId' => $proposal->approved_schedule_id
                ? 'cs_' . $proposal->approved_schedule_id
                : null,
            'createdAt' => $proposal->created_at?->setTimezone($tz)->toIso8601String(),
        ];
    }
}
