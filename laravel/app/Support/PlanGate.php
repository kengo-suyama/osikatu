<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\User;

class PlanGate
{
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
}
