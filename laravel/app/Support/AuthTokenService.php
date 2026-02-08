<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

class AuthTokenService
{
    public static function generateToken(): string
    {
        // 256-bit random token (hex-encoded, 64 chars).
        return bin2hex(random_bytes(32));
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function normalizeBearer(?string $authorizationHeader): ?string
    {
        if (!$authorizationHeader) {
            return null;
        }

        if (!Str::startsWith($authorizationHeader, 'Bearer ')) {
            return null;
        }

        $token = trim(substr($authorizationHeader, 7));
        return $token !== '' ? $token : null;
    }
}

