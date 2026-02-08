<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleUiSetting;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use App\Support\PlanGate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CircleUiSettingsController extends Controller
{
    public function update(Request $request, int $circle)
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        if (!PlanGate::hasPlus($user)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required.', [
                'requiredPlan' => 'plus',
            ], 402);
        }

        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $member = $this->resolveMember($request, $circleModel->id);
        if (!$member || $member->role !== 'owner') {
            return ApiResponse::error('ROLE_REQUIRED_OWNER', 'Owner role required.', null, 403);
        }

        $validator = Validator::make($request->all(), [
            'circleThemeId' => ['nullable', 'string', 'max:40'],
            'specialBgEnabled' => ['nullable', 'boolean'],
            'specialBgVariant' => ['nullable', 'string', 'max:40'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $setting = CircleUiSetting::firstOrNew(['circle_id' => $circleModel->id]);

        $themeId = array_key_exists('circleThemeId', $data)
            ? $data['circleThemeId']
            : $setting->circle_theme_id;

        if ($themeId !== null && !PlanGate::isThemeAllowed($user, $themeId)) {
            return ApiResponse::error(
                'VALIDATION_ERROR',
                'Theme is not allowed.',
                ['circleThemeId' => ['Theme is not allowed.']],
                422
            );
        }

        $specialBgEnabled = array_key_exists('specialBgEnabled', $data)
            ? (bool) $data['specialBgEnabled']
            : (bool) ($setting->special_bg_enabled ?? false);

        $specialBgVariant = array_key_exists('specialBgVariant', $data)
            ? $data['specialBgVariant']
            : $setting->special_bg_variant;

        $setting->fill([
            'circle_theme_id' => $themeId,
            'special_bg_enabled' => $specialBgEnabled,
            'special_bg_variant' => $specialBgVariant,
            'updated_by_user_id' => $user->id,
        ]);
        $setting->save();

        return ApiResponse::success([
            'circleThemeId' => $setting->circle_theme_id,
            'specialBgEnabled' => (bool) $setting->special_bg_enabled,
            'specialBgVariant' => $setting->special_bg_variant,
        ]);
    }

    private function resolveMember(Request $request, int $circleId): ?CircleMember
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
