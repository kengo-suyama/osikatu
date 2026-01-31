<?php

declare(strict_types=1);

namespace App\Support;

use App\Support\MeProfileResolver;

class CurrentUser
{
    public static function id(): int
    {
        $authId = auth()->id();
        if ($authId) {
            return $authId;
        }

        $deviceId = request()?->header('X-Device-Id');
        if ($deviceId) {
            $profile = MeProfileResolver::resolve($deviceId);
            if ($profile?->user_id) {
                return $profile->user_id;
            }
        }

        return 1;
    }
}
