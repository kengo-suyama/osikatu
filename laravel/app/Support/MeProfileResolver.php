<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;
use App\Models\MeProfile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MeProfileResolver
{
    public static function resolve(?string $deviceId): ?MeProfile
    {
        if (!$deviceId) {
            return null;
        }

        $profile = MeProfile::query()->where('device_id', $deviceId)->first();

        if (!$profile) {
            $profile = MeProfile::create([
                'device_id' => $deviceId,
                'nickname' => 'Me',
                'initial' => 'M',
                'user_id' => self::ensureUserId($deviceId),
            ]);
        } elseif (!$profile->user_id) {
            $profile->user_id = self::ensureUserId($deviceId);
            $profile->save();
        }

        return $profile;
    }

    private static function ensureUserId(string $deviceId): int
    {
        $hash = substr(sha1($deviceId), 0, 16);
        $email = "device-{$hash}@osikatu.local";

        $user = User::query()->where('email', $email)->first();
        if ($user) {
            return $user->id;
        }

        $user = User::create([
            'name' => 'Me',
            'email' => $email,
            'password' => Hash::make(Str::random(32)),
        ]);

        return $user->id;
    }
}
