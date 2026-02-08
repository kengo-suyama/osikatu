<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\BillingSubscription;
use App\Models\User;

/**
 * Single source of truth for user plan resolution.
 *
 * Priority order:
 *   1. Active Stripe subscription (Plus) → 'plus'
 *   2. Active trial on free plan → 'premium'
 *   3. User.plan column (fallback) → 'free' | 'premium' | 'plus'
 *
 * Expired/canceled subscriptions with status not in ['active','trialing']
 * are ignored, falling back to user.plan or 'free'.
 */
class SubscriptionResolver
{
    /**
     * Check if user has an active Plus subscription via Stripe.
     */
    public static function hasPlus(User $user): bool
    {
        return BillingSubscription::query()
            ->where('user_id', $user->id)
            ->where('plan', 'plus')
            ->whereIn('status', ['active', 'trialing'])
            ->exists();
    }

    /**
     * Resolve the effective plan for a user.
     * This is THE single function all plan checks should use.
     */
    public static function resolve(User $user): string
    {
        // 1. Active Stripe Plus subscription takes priority
        if (self::hasPlus($user)) {
            return 'plus';
        }

        // 2. Trial active on free plan → premium
        if (PlanGate::isTrialActive($user) && ($user->plan ?? 'free') === 'free') {
            return 'premium';
        }

        // 3. Fallback to user.plan column
        return $user->plan ?? 'free';
    }

    /**
     * Resolve plan for API response (same as resolve).
     * @deprecated Use resolve() instead.
     */
    public static function planForApi(User $user): string
    {
        return self::resolve($user);
    }
}
