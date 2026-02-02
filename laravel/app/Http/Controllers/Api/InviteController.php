<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CircleResource;
use App\Http\Resources\InviteResource;
use App\Models\Circle;
use App\Models\CircleInvite;
use App\Models\CircleMember;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use App\Support\PlanGate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
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
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required to manage invites.', null, 403);
        }

        $validator = Validator::make($request->all(), [
            'type' => ['required', 'in:code,link'],
            'expiresInHours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'maxUses' => ['nullable', 'integer', 'min:1', 'max:9999'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $expiresAt = isset($data['expiresInHours']) ? now()->addHours((int) $data['expiresInHours']) : null;
        $maxUses = isset($data['maxUses']) ? (int) $data['maxUses'] : null;

        $code = null;
        $token = null;

        if ($data['type'] === 'code') {
            do {
                $code = str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
            } while (CircleInvite::query()->where('code', $code)->exists());
        } else {
            $token = Str::random(64);
        }

        $invite = CircleInvite::create([
            'circle_id' => $circleModel->id,
            'type' => $data['type'],
            'code' => $code,
            'token' => $token,
            'expires_at' => $expiresAt,
            'max_uses' => $maxUses,
            'used_count' => 0,
            'created_by' => $userId,
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
            return ApiResponse::error('INVITE_NOT_FOUND', 'Invite not found', null, 404);
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
            return ApiResponse::error('INVITE_LIMIT', 'Invite usage limit reached', null, 410);
        }

        CircleMember::firstOrCreate(
            [
                'circle_id' => $invite->circle_id,
                'user_id' => $userId,
            ],
            [
                'me_profile_id' => $meProfile?->id,
                'role' => 'member',
                'joined_at' => now(),
            ]
        );

        if (!$alreadyMember) {
            $invite->increment('used_count');
            Circle::query()
                ->where('id', $invite->circle_id)
                ->update(['last_activity_at' => now()]);
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
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required to manage invites.', null, 403);
        }

        $invite = CircleInvite::query()
            ->where('circle_id', $circle)
            ->where('type', 'code')
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
                'expires_at' => null,
                'max_uses' => null,
                'used_count' => 0,
                'created_by' => $userId,
            ]);
        }

        return ApiResponse::success(new InviteResource($invite));
    }
}
