<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\ImageUploadService;
use App\Support\PlanGate;
use App\Support\SubscriptionResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MeController extends Controller
{
    public function show()
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $deviceId = request()?->header('X-Device-Id');
        $isGuest = str_starts_with($user->email, 'device-') && str_ends_with($user->email, '@osikatu.local');

        $trialActive = PlanGate::isTrialActive($user);
        $trialRemainingDays = 0;
        if ($trialActive && $user->trial_ends_at) {
            $trialRemainingDays = (int) ceil(now()->diffInSeconds($user->trial_ends_at, false) / 86400);
            $trialRemainingDays = max(0, $trialRemainingDays);
        }

        $plan = SubscriptionResolver::planForApi($user);

        return ApiResponse::success([
            'id' => $user->id,
            'userId' => $isGuest ? null : $user->id,
            'deviceId' => $deviceId ?: null,
            'role' => $isGuest ? 'guest' : 'user',
            'name' => $user->name,
            'email' => $user->email,
            'plan' => $plan,
            'planStatus' => $user->plan_status ?? 'active',
            'effectivePlan' => $plan,
            'trialEndsAt' => $user->trial_ends_at?->toIso8601String(),
            'trialActive' => $trialActive,
            'trialRemainingDays' => $trialRemainingDays,
            'profile' => $this->buildProfilePayload($user),
            'ui' => [
                'themeId' => $user->ui_theme_id,
                'specialBgEnabled' => (bool) $user->ui_special_bg_enabled,
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        if ($request->has('prefectureCode') && $request->input('prefectureCode') === '') {
            $request->merge(['prefectureCode' => null]);
        }
        if ($request->has('bio') && $request->input('bio') === '') {
            $request->merge(['bio' => null]);
        }

        $validator = Validator::make($request->all(), [
            'displayName' => ['required', 'string', 'min:2', 'max:20'],
            'bio' => ['nullable', 'string', 'max:160'],
            'prefectureCode' => ['nullable', 'integer', 'between:1,47'],
            'avatar' => ['nullable', 'image', 'max:5120'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $displayName = trim((string) $data['displayName']);
        $length = function_exists('mb_strlen') ? mb_strlen($displayName) : strlen($displayName);
        if ($length < 2) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'displayName' => ['Display name must be at least 2 characters.'],
            ], 422);
        }

        $user->display_name = $displayName;

        if (array_key_exists('bio', $data)) {
            $bio = $data['bio'];
            $bio = is_string($bio) ? trim($bio) : $bio;
            $user->bio = $bio === '' ? null : $bio;
        }

        if (array_key_exists('prefectureCode', $data)) {
            $user->prefecture_code = $data['prefectureCode'] ?? null;
        }

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
            $stored = ImageUploadService::storePublicImage($file, 'avatars');
            if (isset($stored['error'])) {
                return ApiResponse::error(
                    $stored['error']['code'] ?? 'IMAGE_PROCESS_FAILED',
                    $stored['error']['message'] ?? 'Image upload failed.',
                    null,
                    422
                );
            }
            $user->avatar_path = $stored['path'];
        }

        if (!$user->onboarding_completed_at) {
            $user->onboarding_completed_at = now();
        }

        $user->save();

        return ApiResponse::success($this->buildProfilePayload($user));
    }

    public function updateUiSettings(Request $request)
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $validator = Validator::make($request->all(), [
            'themeId' => ['nullable', 'string', 'max:40'],
            'specialBgEnabled' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $themeId = $data['themeId'] ?? null;
        $specialBgEnabled = (bool) ($data['specialBgEnabled'] ?? $user->ui_special_bg_enabled);

        if ($themeId !== null && !PlanGate::isThemeAllowed($user, $themeId)) {
            return ApiResponse::error(
                'PLAN_THEME_LOCKED',
                'Selected theme is not available on current plan.',
                [
                    'allowed' => PlanGate::allowedThemeIds($user),
                ],
                422
            );
        }

        if (!PlanGate::hasPlus($user)) {
            $specialBgEnabled = false;
        }

        $user->ui_theme_id = $themeId ?? $user->ui_theme_id;
        $user->ui_special_bg_enabled = $specialBgEnabled;
        $user->save();

        return ApiResponse::success([
            'themeId' => $user->ui_theme_id,
            'specialBgEnabled' => (bool) $user->ui_special_bg_enabled,
        ]);
    }

    public function skipOnboarding()
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        if (!$user->onboarding_completed_at) {
            $user->onboarding_completed_at = now();
        }

        if (!$user->display_name) {
            $suffix = str_pad(substr((string) $user->id, -4), 4, '0', STR_PAD_LEFT);
            $prefixes = ['ユーザー', '推し活民'];
            $prefix = $prefixes[random_int(0, count($prefixes) - 1)];
            $user->display_name = $prefix . $suffix;
        }

        $user->save();

        return ApiResponse::success($this->buildProfilePayload($user));
    }

    private function buildProfilePayload(User $user): array
    {
        $avatarUrl = null;
        if ($user->avatar_path) {
            $avatarUrl = str_starts_with($user->avatar_path, 'http://') || str_starts_with($user->avatar_path, 'https://')
                ? $user->avatar_path
                : Storage::disk('public')->url($user->avatar_path);
        }

        return [
            'displayName' => $user->display_name,
            'avatarUrl' => $avatarUrl,
            'bio' => $user->bio,
            'prefectureCode' => $user->prefecture_code,
            'onboardingCompleted' => (bool) $user->onboarding_completed_at,
        ];
    }
}
