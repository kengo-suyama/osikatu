<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CircleAnnouncement;
use App\Models\CircleMember;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CircleAnnouncementController extends Controller
{
    public function show(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $announcement = CircleAnnouncement::query()
            ->where('circle_id', $circle)
            ->first();

        if (!$announcement) {
            return ApiResponse::success([
                'circleId' => $circle,
                'text' => null,
                'updatedAt' => null,
                'updatedBy' => null,
            ]);
        }

        $updatedBy = $announcement->updatedBy?->meProfile;

        return ApiResponse::success([
            'circleId' => $circle,
            'text' => $announcement->text,
            'updatedAt' => $announcement->updated_at?->toIso8601String(),
            'updatedBy' => $updatedBy ? [
                'id' => $updatedBy->id,
                'nickname' => $updatedBy->nickname ?? 'Member',
                'avatarUrl' => $updatedBy->avatar_url ?? null,
                'initial' => $updatedBy->initial ?? '?',
            ] : null,
        ]);
    }

    public function update(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        if (!in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only', null, 403);
        }

        $validator = Validator::make($request->all(), [
            'text' => ['required', 'string', 'max:500'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();

        $announcement = CircleAnnouncement::updateOrCreate(
            ['circle_id' => $circle],
            [
                'text' => trim((string) $data['text']),
                'updated_by_member_id' => $member->id,
            ]
        );

        return ApiResponse::success([
            'circleId' => $circle,
            'text' => $announcement->text,
            'updatedAt' => $announcement->updated_at?->toIso8601String(),
        ]);
    }

    public function destroy(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        if (!in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only', null, 403);
        }

        CircleAnnouncement::query()
            ->where('circle_id', $circle)
            ->delete();

        return ApiResponse::success(['deleted' => true]);
    }

    private function resolveMember(int $circleId, Request $request): ?CircleMember
    {
        $deviceId = $request->header('X-Device-Id');
        if ($deviceId) {
            $profile = MeProfileResolver::resolve($deviceId);
            if ($profile) {
                $member = CircleMember::query()
                    ->where('circle_id', $circleId)
                    ->where('me_profile_id', $profile->id)
                    ->first();
                if ($member) {
                    return $member;
                }
            }
        }

        return CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('user_id', CurrentUser::id())
            ->first();
    }
}
