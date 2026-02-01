<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Circle;
use App\Models\CircleJoinRequest;
use App\Models\CircleMember;
use App\Models\Notification;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use App\Support\OperationLogService;
use App\Support\PlanGate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CircleJoinRequestController extends Controller
{
    public function store(Request $request, int $circle)
    {
        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel || !$circleModel->is_public) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
        }

        $validator = Validator::make($request->all(), [
            'message' => ['nullable', 'string', 'max:200'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $meProfile = MeProfileResolver::resolve($deviceId);
        if (!$meProfile) {
            return ApiResponse::error('PROFILE_NOT_FOUND', 'Me profile not found', null, 404);
        }

        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circleModel->id)
            ->where(function ($query) use ($meProfile, $user): void {
                $query->where('me_profile_id', $meProfile->id)
                    ->orWhere('user_id', $user->id);
            })
            ->first();

        if ($member) {
            return ApiResponse::error('ALREADY_MEMBER', 'Already joined.', null, 409);
        }

        $data = $validator->validated();

        $circleCount = PlanGate::circleMembershipCount($user);
        if (!PlanGate::canJoinMoreCircles($user, $circleCount)) {
            return ApiResponse::error(
                'PLAN_CIRCLE_LIMIT',
                '参加できるサークル枠がいっぱいです',
                PlanGate::circleLimitDetails($user, $circleCount),
                409
            );
        }

        if ($circleModel->join_policy === 'instant' && PlanGate::circleHasPlus($circleModel)) {
            CircleMember::create([
                'circle_id' => $circleModel->id,
                'me_profile_id' => $meProfile->id,
                'user_id' => $user->id,
                'role' => 'member',
                'joined_at' => now(),
            ]);

            $approved = CircleJoinRequest::create([
                'circle_id' => $circleModel->id,
                'me_profile_id' => $meProfile->id,
                'status' => 'approved',
                'message' => $data['message'] ?? null,
                'reviewed_by_member_id' => null,
                'reviewed_at' => now(),
            ]);

            Circle::query()
                ->where('id', $circleModel->id)
                ->update(['last_activity_at' => now()]);

            OperationLogService::log($request, 'join_request.approve', $circleModel->id, [
                'mode' => 'instant',
            ]);

            return ApiResponse::success($this->formatJoinRequest($approved), null, 201);
        }

        $existing = CircleJoinRequest::query()
            ->where('circle_id', $circleModel->id)
            ->where('me_profile_id', $meProfile->id)
            ->first();

        if ($existing) {
            return ApiResponse::success($this->formatJoinRequest($existing));
        }

        $joinRequest = CircleJoinRequest::create([
            'circle_id' => $circleModel->id,
            'me_profile_id' => $meProfile->id,
            'status' => 'pending',
            'message' => $data['message'] ?? null,
        ]);

        $this->notifyJoinRequestCreated($circleModel, $meProfile);
        OperationLogService::log($request, 'join_request.create', $circleModel->id);

        return ApiResponse::success($this->formatJoinRequest($joinRequest), null, 201);
    }

    public function index(Request $request, int $circle)
    {
        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }
        if (!PlanGate::circleHasPlus($circleModel)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required to manage join requests.', null, 403);
        }

        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
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

        $requests = CircleJoinRequest::query()
            ->where('circle_id', $circle)
            ->where('status', 'pending')
            ->with('meProfile')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return ApiResponse::success($requests->map(function (CircleJoinRequest $request): array {
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
        })->values()->all());
    }

    public function approve(Request $request, int $circle, int $joinRequest = 0)
    {
        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }
        if (!PlanGate::circleHasPlus($circleModel)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required to manage join requests.', null, 403);
        }

        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
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

        $requestId = $joinRequest ?: (int) $request->input('requestId');
        if ($requestId <= 0) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'requestId' => ['requestId is required.'],
            ], 422);
        }

        $joinRequest = CircleJoinRequest::query()
            ->where('circle_id', $circle)
            ->where('id', $requestId)
            ->first();

        if (!$joinRequest || $joinRequest->status !== 'pending') {
            return ApiResponse::error('NOT_FOUND', 'Join request not found.', null, 404);
        }

        $requesterProfile = $joinRequest->meProfile;
        if (!$requesterProfile) {
            return ApiResponse::error('PROFILE_NOT_FOUND', 'Me profile not found', null, 404);
        }

        $requesterUser = $this->ensureRequesterUser($requesterProfile);

        $currentCount = PlanGate::circleMembershipCount($requesterUser);
        if (!PlanGate::canJoinMoreCircles($requesterUser, $currentCount)) {
            $this->notifyJoinRequestLimit($circleModel, $requesterProfile, $member);
            return ApiResponse::error(
                'PLAN_CIRCLE_LIMIT',
                '参加できるサークル枠がいっぱいです',
                PlanGate::circleLimitDetails($requesterUser, $currentCount),
                409
            );
        }

        CircleMember::firstOrCreate(
            [
                'circle_id' => $circle,
                'user_id' => $requesterUser->id,
            ],
            [
                'me_profile_id' => $joinRequest->me_profile_id,
                'role' => 'member',
                'joined_at' => now(),
            ]
        );

        $joinRequest->update([
            'status' => 'approved',
            'reviewed_by_member_id' => $member->id,
            'reviewed_at' => now(),
        ]);

        $this->notifyJoinRequestApproved($circleModel, $requesterProfile);
        OperationLogService::log($request, 'join_request.approve', $circleModel->id);

        Circle::query()
            ->where('id', $circle)
            ->update(['last_activity_at' => now()]);

        return ApiResponse::success(null);
    }

    public function reject(Request $request, int $circle, int $joinRequest = 0)
    {
        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }
        if (!PlanGate::circleHasPlus($circleModel)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required to manage join requests.', null, 403);
        }

        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
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

        $requestId = $joinRequest ?: (int) $request->input('requestId');
        if ($requestId <= 0) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'requestId' => ['requestId is required.'],
            ], 422);
        }

        $joinRequest = CircleJoinRequest::query()
            ->where('circle_id', $circle)
            ->where('id', $requestId)
            ->first();

        if (!$joinRequest || $joinRequest->status !== 'pending') {
            return ApiResponse::error('NOT_FOUND', 'Join request not found.', null, 404);
        }

        $joinRequest->update([
            'status' => 'rejected',
            'reviewed_by_member_id' => $member->id,
            'reviewed_at' => now(),
        ]);

        $requesterProfile = $joinRequest->meProfile;
        if ($requesterProfile) {
            $this->notifyJoinRequestRejected($circleModel, $requesterProfile);
        }

        OperationLogService::log($request, 'join_request.reject', $circleModel->id);

        return ApiResponse::success(null);
    }

    private function formatJoinRequest(CircleJoinRequest $request): array
    {
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
    }

    private function ensureRequesterUser(\App\Models\MeProfile $profile): User
    {
        if ($profile->user_id) {
            $user = User::query()->find($profile->user_id);
            if ($user) {
                return $user;
            }
        }

        $profile = MeProfileResolver::resolve($profile->device_id);
        $user = User::query()->find($profile?->user_id);
        if ($user) {
            return $user;
        }

        return User::query()->findOrFail(CurrentUser::id());
    }

    private function notifyJoinRequestCreated(Circle $circle, \App\Models\MeProfile $requester): void
    {
        $nickname = $requester->nickname ?? 'Member';
        $circleName = $circle->name ?? 'サークル';

        $owners = CircleMember::query()
            ->where('circle_id', $circle->id)
            ->whereIn('role', ['owner', 'admin'])
            ->whereNotNull('me_profile_id')
            ->get();

        foreach ($owners as $owner) {
            if (!$owner->me_profile_id) {
                continue;
            }
            $this->createNotification(
                $owner->me_profile_id,
                'join_request',
                '参加リクエストが届きました',
                "{$nickname} さんが「{$circleName}」に参加したいようです。確認してOKなら承認してください。"
            );
        }

        $this->createNotification(
            $requester->id,
            'join_request_sent',
            '参加リクエストを送りました',
            '承認されると参加できます。それまでは個人モードで利用できます🌱'
        );
    }

    private function notifyJoinRequestApproved(Circle $circle, \App\Models\MeProfile $requester): void
    {
        $circleName = $circle->name ?? 'サークル';

        $this->createNotification(
            $requester->id,
            'join_request_approved',
            '参加が承認されました🎉',
            "「{$circleName}」へようこそ！さっそく予定や投稿を見てみましょう。"
        );
    }

    private function notifyJoinRequestRejected(Circle $circle, \App\Models\MeProfile $requester): void
    {
        $body = "サークルの方針により今回は参加が難しいようです。別の公開サークルを探すこともできます。\n\n";
        $body .= 'ご連絡ありがとうございます。サークルの方針により、今回は参加を見送らせていただきます。またご縁がありましたらよろしくお願いします。';

        $this->createNotification(
            $requester->id,
            'join_request_rejected',
            '今回は参加が見送られました',
            $body
        );
    }

    private function notifyJoinRequestLimit(Circle $circle, \App\Models\MeProfile $requester, CircleMember $reviewer): void
    {
        $nickname = $requester->nickname ?? 'Member';

        $this->createNotification(
            $requester->id,
            'join_request_blocked',
            '参加枠がいっぱいです',
            '現在のプランでは参加できるサークルが1つまでです。サークルを1つ抜けるか、トライアル/プレミアムで枠を増やせます。個人モードの利用はそのまま続けられます🌱'
        );

        if ($reviewer->me_profile_id) {
            $this->createNotification(
                $reviewer->me_profile_id,
                'join_request_blocked_admin',
                '参加リクエストの承認が保留になりました',
                "{$nickname} さんは参加枠がいっぱいのため追加できませんでした。相手側で整理後に再度承認できます。"
            );
        }
    }

    private function createNotification(
        int $meProfileId,
        string $type,
        string $title,
        string $body
    ): void {
        Notification::create([
            'me_profile_id' => $meProfileId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'action_url' => null,
        ]);
    }
}
