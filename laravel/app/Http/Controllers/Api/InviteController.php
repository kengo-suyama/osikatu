<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CircleResource;
use App\Http\Resources\InviteResource;
use App\Models\Circle;
use App\Models\CircleInvite;
use App\Models\CircleMember;
use App\Models\OperationLog;
use App\Models\User;
use App\Services\PointsService;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use App\Support\PlanGate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Support\OperationLogService;
use Illuminate\Support\Str;

class InviteController extends Controller
{
    public function store(Request $request, int $circle)
    {
        $userId = CurrentUser::id();
        $circleModel = Circle::query()->where('id', $circle)->first();

        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circle)
            ->where('user_id', $userId)
            ->first();

        if (!$member || !in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only', null, 403);
        }

        if (!PlanGate::circleHasPlus($circleModel)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required to manage invites.', [
                'requiredPlan' => 'plus',
            ], 402);
        }

        $validator = Validator::make($request->all(), [
            'type' => ['nullable', 'in:code,link'],
            'role' => ['nullable', 'in:member,admin'],
            'expiresInHours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'expiresInDays' => ['nullable', 'integer', 'min:1', 'max:90'],
            'maxUses' => ['nullable', 'integer', 'min:1', 'max:9999'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $expiresAt = null;
        if (isset($data['expiresInDays'])) {
            $expiresAt = now()->addDays((int) $data['expiresInDays'])->endOfDay();
        } elseif (isset($data['expiresInHours'])) {
            $expiresAt = now()->addHours((int) $data['expiresInHours']);
        }
        $maxUses = isset($data['maxUses']) ? (int) $data['maxUses'] : null;
        $role = $data['role'] ?? 'member';

        $code = null;
        $token = null;

        $type = $data['type'] ?? 'code';

        if ($type === 'code') {
            do {
                $code = str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
            } while (CircleInvite::query()->where('code', $code)->exists());
        } else {
            $token = Str::random(64);
        }

        $invite = CircleInvite::create([
            'circle_id' => $circleModel->id,
            'type' => $type,
            'code' => $code,
            'token' => $token,
            'role' => $role,
            'expires_at' => $expiresAt,
            'max_uses' => $maxUses,
            'used_count' => 0,
            'created_by' => $userId,
            'created_by_device_id' => $request->header('X-Device-Id'),
        ]);

        OperationLogService::log($request, 'invite.create', $circleModel->id, [
            'circleId' => (int) $circleModel->id,
            'inviteId' => $invite->id,
            'type' => $type,
            'role' => $role,
            'createdBy' => $userId,
        ]);

        return ApiResponse::success(new InviteResource($invite), null, 201);
    }

    public function join(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => ['nullable', 'string', 'size:8'],
            'token' => ['nullable', 'string', 'size:64'],
        ]);

        $validator->after(function ($validator) use ($request): void {
            if (empty($request->input('code')) && empty($request->input('token'))) {
                $validator->errors()->add('code', 'Either code or token is required.');
            }
        });

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $invite = null;

        if (!empty($data['code'])) {
            $invite = CircleInvite::query()->where('code', $data['code'])->first();
        }

        if (!$invite && !empty($data['token'])) {
            $invite = CircleInvite::query()->where('token', $data['token'])->first();
        }

        if (!$invite) {
            return ApiResponse::error('INVITE_INVALID', 'Invite not found', null, 404);
        }

        if ($invite->revoked_at) {
            return ApiResponse::error('INVITE_REVOKED', 'Invite has been revoked', null, 410);
        }

        if ($invite->expires_at && $invite->expires_at->isPast()) {
            return ApiResponse::error('INVITE_EXPIRED', 'Invite has expired', null, 410);
        }

        $userId = CurrentUser::id();
        $user = User::query()->find($userId);
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $alreadyMember = CircleMember::query()
            ->where('circle_id', $invite->circle_id)
            ->where('user_id', $userId)
            ->exists();

        $circleCount = PlanGate::circleMembershipCount($user);

        if (!$alreadyMember && !PlanGate::canJoinMoreCircles($user, $circleCount)) {
            return ApiResponse::error(
                'PLAN_CIRCLE_LIMIT',
                '参加できるサークル枠がいっぱいです',
                PlanGate::circleLimitDetails($user, $circleCount),
                409
            );
        }

        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
        }
        $meProfile = MeProfileResolver::resolve($deviceId);

        if ($invite->max_uses !== null && $invite->used_count >= $invite->max_uses) {
            return ApiResponse::error('INVITE_USED_UP', 'Invite usage limit reached', null, 410);
        }

        $circleMember = CircleMember::firstOrCreate(
            [
                'circle_id' => $invite->circle_id,
                'user_id' => $userId,
            ],
            [
                'me_profile_id' => $meProfile?->id,
                'role' => in_array($invite->role, ['admin', 'member'], true) ? $invite->role : 'member',
                'joined_at' => now(),
            ]
        );

        $joinedNow = (bool) $circleMember->wasRecentlyCreated;

        if ($joinedNow) {
            $invite->increment('used_count');
            Circle::query()
                ->where('id', $invite->circle_id)
                ->update(['last_activity_at' => now()]);

            $inviterUserId = $invite->created_by ? (int) $invite->created_by : null;
            if ($inviterUserId && $inviterUserId !== $userId) {
                $requestId = (string) ($request->header('X-Request-Id') ?? '');
                $requestId = trim($requestId) !== '' ? $requestId : null;

                // Reward both inviter and invitee once per pair.
                $idempotencyKey = "invite_reward:pair:{$inviterUserId}:{$userId}";

                PointsService::add(
                    $inviterUserId,
                    null,
                    50,
                    'invite_reward_inviter',
                    [
                        'source' => 'invite',
                        'circleId' => (int) $invite->circle_id,
                        'inviteeUserId' => (int) $userId,
                    ],
                    $requestId,
                    $idempotencyKey
                );

                PointsService::add(
                    $userId,
                    null,
                    20,
                    'invite_reward_invitee',
                    [
                        'source' => 'invite',
                        'circleId' => (int) $invite->circle_id,
                        'inviterUserId' => (int) $inviterUserId,
                    ],
                    $requestId,
                    $idempotencyKey
                );
            }
        }

        if ($joinedNow) {
            OperationLogService::log($request, 'invite.join', (int) $invite->circle_id, [
                'circleId' => (int) $invite->circle_id,
                'inviteId' => $invite->id,
                'joinedUserId' => $userId,
                'inviterUserId' => $invite->created_by ? (int) $invite->created_by : null,
            ]);
        }

        if ($circleCount === 0 && !$user->trial_ends_at) {
            $user->trial_ends_at = now()->addDays(7);
            $user->save();
        }

        $circle = Circle::query()
            ->withCount('members')
            ->where('id', $invite->circle_id)
            ->first();

        if (!$circle) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        return ApiResponse::success(new CircleResource($circle));
    }

    public function accept(Request $request)
    {
        return $this->join($request);
    }

    public function show(Request $request, int $circle)
    {
        $userId = CurrentUser::id();
        $circleModel = Circle::query()->where('id', $circle)->first();

        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circle)
            ->where('user_id', $userId)
            ->first();

        if (!$member || !in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only', null, 403);
        }

        if (!PlanGate::circleHasPlus($circleModel)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required to manage invites.', [
                'requiredPlan' => 'plus',
            ], 402);
        }

        $invite = CircleInvite::query()
            ->where('circle_id', $circle)
            ->where('type', 'code')
            ->whereNull('revoked_at')
            ->where(function ($query): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('id')
            ->first();

        if (!$invite) {
            do {
                $code = str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
            } while (CircleInvite::query()->where('code', $code)->exists());

            $invite = CircleInvite::create([
                'circle_id' => $circle,
                'type' => 'code',
                'code' => $code,
                'token' => null,
                'role' => 'member',
                'expires_at' => null,
                'revoked_at' => null,
                'max_uses' => null,
                'used_count' => 0,
                'created_by' => $userId,
                'created_by_device_id' => $request->header('X-Device-Id'),
            ]);
        }

        return ApiResponse::success(new InviteResource($invite));
    }

    public function index(Request $request, int $circle)
    {
        $userId = CurrentUser::id();
        $circleModel = Circle::query()->where('id', $circle)->first();

        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circle)
            ->where('user_id', $userId)
            ->first();

        if (!$member || !in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only', null, 403);
        }

        $invites = CircleInvite::query()
            ->where('circle_id', $circle)
            ->whereNull('revoked_at')
            ->where(function ($query): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return ApiResponse::success(InviteResource::collection($invites));
    }

    public function revoke(Request $request, int $circle, int $invite)
    {
        $userId = CurrentUser::id();
        $circleModel = Circle::query()->where('id', $circle)->first();

        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circle)
            ->where('user_id', $userId)
            ->first();

        if (!$member || !in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only', null, 403);
        }

        $inviteModel = CircleInvite::query()
            ->where('circle_id', $circle)
            ->where('id', $invite)
            ->first();

        if (!$inviteModel) {
            return ApiResponse::error('NOT_FOUND', 'Invite not found.', null, 404);
        }

        $inviteModel->revoked_at = now();
        $inviteModel->save();

        OperationLogService::log($request, 'invite.revoke', (int) $circle, [
            'circleId' => (int) $circle,
            'inviteId' => $invite,
            'revokedBy' => $userId,
        ]);

        return ApiResponse::success(new InviteResource($inviteModel));
    }

    public function regenerate(string $circleId)
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $circleModel = Circle::query()->find($circleId);
        if (!$circleModel) {
            return ApiResponse::error('CIRCLE_NOT_FOUND', 'Circle not found.', null, 404);
        }

        if ($deny = PlanGate::requireCirclePlus($circleModel, 'Plus plan required to manage invites.')) {
            return $deny;
        }

        $member = CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('user_id', $user->id)
            ->first();

        if (!$member || !in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Only owner or admin can regenerate invite codes.', null, 403);
        }

        // Revoke all existing active invites
        CircleInvite::query()
            ->where('circle_id', $circleId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        // Create new invite
        $code = strtoupper(substr(md5(uniqid((string) random_int(0, PHP_INT_MAX), true)), 0, 8));
        $newInvite = CircleInvite::create([
            'circle_id' => $circleId,
            'type' => 'code',
            'created_by' => $user->id,
            'code' => $code,
            'max_uses' => null,
            'expires_at' => null,
        ]);

        OperationLog::create([
            'circle_id' => (int) $circleId,
            'user_id' => $user->id,
            'action' => 'invite.regenerate',
            'meta' => ['circleId' => (int) $circleId],
            'created_at' => now(),
        ]);

        return ApiResponse::success([
            'id' => $newInvite->id,
            'code' => $newInvite->code,
            'circleId' => $circleId,
        ]);
    }

}
