<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\User;

class PlanGate
{
    private const CHAT_FREE_MONTHLY_LIMIT = 30;

    public static function isTrialActive(User $user): bool
    {
        return $user->trial_ends_at !== null && $user->trial_ends_at->isFuture();
    }

    public static function effectiveUserPlan(User $user): string
    {
        if (self::isTrialActive($user) && $user->plan === 'free') {
            return 'premium';
        }

        return $user->plan;
    }

    public static function hasPremium(User $user): bool
    {
        $plan = self::effectiveUserPlan($user);

        return in_array($plan, ['premium', 'plus'], true);
    }

    public static function hasPlus(User $user): bool
    {
        return ($user->plan ?? 'free') === 'plus';
    }

    public static function circleHasPlus(?Circle $circle): bool
    {
        return $circle !== null && $circle->plan === 'plus';
    }

    public static function circleMembershipCount(User $user): int
    {
        return CircleMember::query()
            ->where('user_id', $user->id)
            ->count();
    }

    public static function canJoinMoreCircles(User $user, ?int $currentCount = null): bool
    {
        if (self::hasPremium($user)) {
            return true;
        }

        $count = $currentCount ?? self::circleMembershipCount($user);

        return $count < 1;
    }

    public static function circleLimitDetails(User $user, int $currentCount): array
    {
        return [
            'limit' => 1,
            'current' => $currentCount,
            'plan' => $user->plan ?? 'free',
            'trialEndsAt' => $user->trial_ends_at?->toIso8601String(),
            'suggestions' => [
                'leave_circle',
                'start_trial',
                'upgrade_premium',
                'continue_personal',
            ],
        ];
    }

    public static function chatMonthlyLimit(User $user): ?int
    {
        return self::hasPremium($user) ? null : self::CHAT_FREE_MONTHLY_LIMIT;
    }

    public static function canSendChat(User $user, int $currentCount): bool
    {
        if (self::hasPremium($user)) {
            return true;
        }

        return $currentCount < self::CHAT_FREE_MONTHLY_LIMIT;
    }

    public static function chatLimitDetails(User $user, int $currentCount): array
    {
        return [
            'limit' => self::CHAT_FREE_MONTHLY_LIMIT,
            'current' => $currentCount,
            'plan' => $user->plan ?? 'free',
            'trialEndsAt' => $user->trial_ends_at?->toIso8601String(),
            'suggestions' => [
                'start_trial',
                'upgrade_premium',
                'continue_free',
            ],
        ];
    }

    public static function allowedThemeIds(User $user): array
    {
        $free = ['light', 'dark', 'sakura', 'mint', 'sunset'];
        if (self::hasPremium($user)) {
            return array_merge($free, ['midnight', 'neon', 'royal', 'ocean', 'berry']);
        }
        return $free;
    }

    public static function isThemeAllowed(User $user, string $themeId): bool
    {
        return in_array($themeId, self::allowedThemeIds($user), true);
    }

    public static function allowedFrameIds(User $user): array
    {
        $free = [
            'none',
            'simple-line',
            'soft-card',
            'dot-pop',
            'tape',
        ];

        $premium = [
            'double-line',
            'gradient-edge',
            'sticker',
            'comic-pop',
            'polaroid_elegant',
            'polaroid_pop',
            'neon_blue',
            'neon_purple',
        ];

        $plus = [
            'gold-lux',
            'holo',
            'sparkle',
            'festival_gold',
            'festival_holo',
        ];

        if (self::hasPlus($user)) {
            return array_merge($free, $premium, $plus);
        }

        if (self::hasPremium($user)) {
            return array_merge($free, $premium);
        }

        return $free;
    }

    public static function isFrameAllowed(User $user, string $frameId): bool
    {
        return in_array($frameId, self::allowedFrameIds($user), true);
    }
}
