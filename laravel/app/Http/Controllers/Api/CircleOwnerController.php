<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OwnerDashboardResource;
use App\Http\Resources\PostResource;
use App\Models\BillAssignment;
use App\Models\Circle;
use App\Models\CircleJoinRequest;
use App\Models\CircleMember;
use App\Models\CircleNotice;
use App\Models\CirclePlan;
use App\Models\NoticeAck;
use App\Models\PlanRsvp;
use App\Models\Post;
use App\Models\PostAck;
use App\Models\SplitBill;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use App\Support\PlanGate;
use Illuminate\Http\Request;

class CircleOwnerController extends Controller
{
    public function dashboard(Request $request, int $circle)
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
        }

        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        if (!PlanGate::circleHasPlus($circleModel)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required for owner dashboard.', [
                'requiredPlan' => 'plus',
            ], 402);
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

        $members = CircleMember::query()
            ->where('circle_id', $circle)
            ->with('meProfile')
            ->get();

        $activeNotice = CircleNotice::query()
            ->where('circle_id', $circle)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first();

        $activeBill = SplitBill::query()
            ->where('circle_id', $circle)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first();

        $activePlan = CirclePlan::query()
            ->where('circle_id', $circle)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first();

        $pinnedPost = Post::query()
            ->where('circle_id', $circle)
            ->where('is_pinned', true)
            ->whereIn('pin_kind', ['reminder', 'deadline'])
            ->with(['authorMember.meProfile', 'user', 'media'])
            ->withCount('likes')
            ->withCount('acks')
            ->withCount(['likes as liked_by_me' => function ($query): void {
                $query->where('user_id', CurrentUser::id());
            }])
            ->withCount(['acks as acked_by_me' => function ($query) use ($member): void {
                $query->where('circle_member_id', $member->id);
            }])
            ->orderByDesc('id')
            ->first();

        $unconfirmedMembers = [];
        if ($pinnedPost) {
            $ackedIds = PostAck::query()
                ->where('post_id', $pinnedPost->id)
                ->pluck('circle_member_id')
                ->all();

            $unconfirmedMembers = $members
                ->filter(fn ($memberItem) => !in_array($memberItem->id, $ackedIds, true))
                ->map(fn ($memberItem) => $this->buildMemberBrief($memberItem))
                ->values()
                ->all();
        } elseif ($activeNotice) {
            $ackedIds = NoticeAck::query()
                ->where('notice_id', $activeNotice->id)
                ->pluck('circle_member_id')
                ->all();

            $unconfirmedMembers = $members
                ->filter(fn ($memberItem) => !in_array($memberItem->id, $ackedIds, true))
                ->map(fn ($memberItem) => $this->buildMemberBrief($memberItem))
                ->values()
                ->all();
        }

        $unpaidMembers = [];
        if ($activeBill) {
            $assignments = BillAssignment::query()
                ->where('bill_id', $activeBill->id)
                ->whereNull('paid_at')
                ->with('member.meProfile')
                ->get();

            $unpaidMembers = $assignments
                ->map(fn ($assignment) => [
                    'member' => $this->buildMemberBrief($assignment->member),
                    'amountYen' => (int) $assignment->amount_yen,
                ])
                ->values()
                ->all();
        }

        $rsvpPendingMembers = [];
        if ($activePlan) {
            $rsvps = PlanRsvp::query()
                ->where('plan_id', $activePlan->id)
                ->get()
                ->keyBy('circle_member_id');

            $rsvpPendingMembers = $members
                ->filter(function ($memberItem) use ($rsvps): bool {
                    $rsvp = $rsvps->get($memberItem->id);
                    return !$rsvp || $rsvp->status === null;
                })
                ->map(fn ($memberItem) => $this->buildMemberBrief($memberItem))
                ->values()
                ->all();
        }

        $deadlineMeta = $this->resolveNextDeadlineMeta($activeNotice, $activeBill, $activePlan);
        $nextDeadline = null;
        if ($deadlineMeta) {
            $remaining = max(0, now()->diffInMinutes($deadlineMeta['at'], false));
            $nextDeadline = [
                'kind' => $deadlineMeta['kind'],
                'title' => $deadlineMeta['title'],
                'at' => $deadlineMeta['at']?->toIso8601String(),
                'remainingMinutes' => $remaining,
            ];
        }

        $payload = [
            'circleId' => $circle,
            'myRole' => $member->role,
            'nextDeadline' => $nextDeadline,
            'counts' => [
                'unconfirmed' => count($unconfirmedMembers),
                'unpaid' => count($unpaidMembers),
                'rsvpPending' => count($rsvpPendingMembers),
            ],
            'unconfirmedMembers' => $unconfirmedMembers,
            'unpaidMembers' => $unpaidMembers,
            'rsvpPendingMembers' => $rsvpPendingMembers,
            'pinnedPost' => $pinnedPost ? new PostResource($pinnedPost) : null,
            'joinRequests' => $this->buildJoinRequests($circle),
        ];

        return ApiResponse::success(new OwnerDashboardResource($payload));
    }

    public function remind(Request $request, int $circle)
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
        }

        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        if (!PlanGate::circleHasPlus($circleModel)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required for owner dashboard.', [
                'requiredPlan' => 'plus',
            ], 402);
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

        $activeNotice = CircleNotice::query()
            ->where('circle_id', $circle)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first();

        $activeBill = SplitBill::query()
            ->where('circle_id', $circle)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first();

        $activePlan = CirclePlan::query()
            ->where('circle_id', $circle)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first();

        $deadlineMeta = $this->resolveNextDeadlineMeta($activeNotice, $activeBill, $activePlan);
        $pinDueAt = $deadlineMeta['at'] ?? null;

        $existingPinnedIds = Post::query()
            ->where('circle_id', $circle)
            ->where('is_pinned', true)
            ->whereIn('pin_kind', ['reminder', 'deadline'])
            ->pluck('id')
            ->all();

        if (!empty($existingPinnedIds)) {
            Post::query()
                ->whereIn('id', $existingPinnedIds)
                ->update(['is_pinned' => false]);

            PostAck::query()
                ->whereIn('post_id', $existingPinnedIds)
                ->delete();
        }

        $post = Post::create([
            'circle_id' => $circle,
            'author_member_id' => $member->id,
            'user_id' => $member->user_id ?? CurrentUser::id(),
            'body' => '【確認お願いします】未確認/未払い/出欠の入力をお願いします🙏',
            'tags' => [],
            'is_pinned' => true,
            'pin_kind' => 'reminder',
            'pin_due_at' => $pinDueAt,
            'like_count' => 0,
        ]);

        $post->load(['authorMember.meProfile', 'user', 'media']);
        $post->loadCount('likes');
        $post->loadCount('acks');
        $post->liked_by_me = 0;
        $post->acked_by_me = 0;

        Circle::query()
            ->where('id', $circle)
            ->update(['last_activity_at' => now()]);

        return ApiResponse::success(new PostResource($post), null, 201);
    }

    private function buildMemberBrief(?CircleMember $member): array
    {
        if (!$member) {
            return [
                'id' => 0,
                'nickname' => null,
                'avatarUrl' => null,
                'initial' => '?',
                'role' => 'member',
            ];
        }

        $profile = $member->meProfile;
        $nickname = $profile?->nickname ?? 'Member';
        $initial = $profile?->initial ?? mb_substr($nickname, 0, 1) ?: '?';

        return [
            'id' => $member->id,
            'nickname' => $nickname,
            'avatarUrl' => $profile?->avatar_url ?? null,
            'initial' => $initial,
            'role' => $member->role,
        ];
    }

    private function resolveNextDeadlineMeta(
        ?CircleNotice $notice,
        ?SplitBill $bill,
        ?CirclePlan $plan
    ): ?array {
        $candidates = [];

        if ($notice && $notice->due_at) {
            $candidates[] = [
                'kind' => 'notice',
                'title' => $notice->title,
                'at' => $notice->due_at,
            ];
        }

        if ($bill && $bill->due_at) {
            $candidates[] = [
                'kind' => 'payment',
                'title' => $bill->title,
                'at' => $bill->due_at,
            ];
        }

        if ($plan && $plan->event_at) {
            $candidates[] = [
                'kind' => 'plan',
                'title' => $plan->title,
                'at' => $plan->event_at,
            ];
        }

        if (empty($candidates)) {
            return null;
        }

        usort($candidates, function ($a, $b): int {
            return $a['at']->getTimestamp() <=> $b['at']->getTimestamp();
        });

        return $candidates[0];
    }

    private function buildJoinRequests(int $circleId): array
    {
        $requests = CircleJoinRequest::query()
            ->where('circle_id', $circleId)
            ->where('status', 'pending')
            ->with('meProfile')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return $requests
            ->map(function (CircleJoinRequest $request): array {
                $profile = $request->meProfile;
                $nickname = $profile?->nickname ?? 'Member';
                $initial = $profile?->initial ?? mb_substr($nickname, 0, 1) ?: '?';

                return [
                    'id' => $request->id,
                    'member' => [
                        'id' => $profile?->id ?? 0,
                        'nickname' => $nickname,
                        'avatarUrl' => $profile?->avatar_url ?? null,
                        'initial' => $initial,
                        'role' => 'member',
                    ],
                    'message' => $request->message,
                    'status' => $request->status,
                    'requestedAt' => $request->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }
}
