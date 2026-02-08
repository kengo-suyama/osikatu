<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\BillingSubscription;
use App\Models\User;

class SubscriptionResolver
{
    public static function hasPlus(User $user): bool
    {
        return BillingSubscription::query()
            ->where('user_id', $user->id)
            ->where('plan', 'plus')
            ->whereIn('status', ['active', 'trialing'])
            ->exists();
    }

    public static function planForApi(User $user): string
    {
        return self::hasPlus($user) ? 'plus' : 'free';
    }
}

