<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;

class Entitlements
{
    public const PLAN_FREE = 'free';
    public const PLAN_PLUS = 'plus';
    public const PLAN_PREMIUM = 'premium';

    private const QUOTAS = [
        self::PLAN_FREE => [
            'oshiMax' => 10,
            'scheduleMax' => 10,
            'albumMax' => 50,
            'chatMonthly' => 30,
        ],
        self::PLAN_PLUS => [
            'oshiMax' => 50,
            'scheduleMax' => 50,
            'albumMax' => 500,
            'chatMonthly' => null,
        ],
        self::PLAN_PREMIUM => [
            'oshiMax' => null,
            'scheduleMax' => null,
            'albumMax' => null,
            'chatMonthly' => null,
        ],
    ];

    private const FEATURES = [
        self::PLAN_FREE => [
            'adsEnabled' => true,
            'chatImage' => true,
            'chatVideo' => false,
            'albumVideo' => false,
            'circlePins' => 3,
            'ownerDashboard' => false,
        ],
        self::PLAN_PLUS => [
            'adsEnabled' => false,
            'chatImage' => true,
            'chatVideo' => true,
            'albumVideo' => true,
            'circlePins' => 10,
            'ownerDashboard' => true,
        ],
        self::PLAN_PREMIUM => [
            'adsEnabled' => false,
            'chatImage' => true,
            'chatVideo' => true,
            'albumVideo' => true,
            'circlePins' => 10,
            'ownerDashboard' => true,
        ],
    ];

    /**
     * Resolve effective plan via SubscriptionResolver (single source of truth).
     */
    public static function effectivePlan(User $user): string
    {
        return SubscriptionResolver::resolve($user);
    }

    public static function quotas(User $user): array
    {
        $plan = self::effectivePlan($user);

        return self::QUOTAS[$plan] ?? self::QUOTAS[self::PLAN_FREE];
    }

    public static function features(User $user): array
    {
        $plan = self::effectivePlan($user);

        return self::FEATURES[$plan] ?? self::FEATURES[self::PLAN_FREE];
    }

    public static function forApi(User $user): array
    {
        $effective = self::effectivePlan($user);
        return [
            // In API responses, `plan` should reflect the effective plan (Stripe subscription / trial aware)
            // to avoid UI inconsistencies ("paid but still looks free").
            'plan' => $effective,
            'effectivePlan' => $effective,
            'planStatus' => $user->plan_status ?? 'active',
            'trialEndsAt' => $user->trial_ends_at?->toIso8601String(),
            'quotas' => self::quotas($user),
            'features' => self::features($user),
        ];
    }

    public static function canAddOshi(User $user, int $currentCount): bool
    {
        $quotas = self::quotas($user);
        $max = $quotas['oshiMax'] ?? null;

        return $max === null || $currentCount < $max;
    }

    public static function canAddSchedule(User $user, int $currentCount): bool
    {
        $quotas = self::quotas($user);
        $max = $quotas['scheduleMax'] ?? null;

        return $max === null || $currentCount < $max;
    }

    public static function canAddAlbum(User $user, int $currentCount): bool
    {
        $quotas = self::quotas($user);
        $max = $quotas['albumMax'] ?? null;

        return $max === null || $currentCount < $max;
    }

    public static function canUploadVideo(User $user): bool
    {
        $features = self::features($user);

        return $features['chatVideo'] ?? false;
    }

    public static function canUploadAlbumVideo(User $user): bool
    {
        $features = self::features($user);

        return $features['albumVideo'] ?? false;
    }
}
