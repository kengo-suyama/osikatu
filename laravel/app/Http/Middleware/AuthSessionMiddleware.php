<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\AuthSession;
use App\Support\ApiResponse;
use App\Support\AuthTokenService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthSessionMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = AuthTokenService::normalizeBearer($request->header('Authorization'));
        if ($token === null) {
            return $next($request);
        }

        $tokenHash = AuthTokenService::hashToken($token);
        $session = AuthSession::query()
            ->where('token_hash', $tokenHash)
            ->first();

        if (!$session) {
            return ApiResponse::error('AUTH_REQUIRED', 'Invalid session token.', null, 401);
        }

        if ($session->expires_at !== null && $session->expires_at->isPast()) {
            return ApiResponse::error('AUTH_REQUIRED', 'Session expired.', null, 401);
        }

        // Make downstream auth()->id() available and keep deviceId available to CurrentUser fallback logic.
        Auth::loginUsingId((int) $session->user_id);
        $request->headers->set('X-Device-Id', $session->device_id);

        return $next($request);
    }
}

