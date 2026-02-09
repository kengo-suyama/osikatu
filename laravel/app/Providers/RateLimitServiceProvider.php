<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class RateLimitServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $limits = config('security.rate_limits', []);

        RateLimiter::for('auth_link_start', function (Request $request) use ($limits) {
            $cfg = $limits['auth_link_start'] ?? ['max_attempts' => 5, 'decay_minutes' => 1];
            return Limit::perMinutes($cfg['decay_minutes'], $cfg['max_attempts'])
                ->by($request->ip())
                ->response(function () use ($request) {
                    Log::warning('rate_limit_hit', [
                        'type' => 'rate_limit',
                        'limiter' => 'auth_link_start',
                        'ip' => $request->ip(),
                        'path' => $request->path(),
                    ]);
                    return response()->json([
                        'error' => ['code' => 'RATE_LIMITED', 'message' => 'Too many requests.'],
                    ], 429);
                });
        });

        RateLimiter::for('invite_join', function (Request $request) use ($limits) {
            $cfg = $limits['invite_join'] ?? ['max_attempts' => 10, 'decay_minutes' => 1];
            return Limit::perMinutes($cfg['decay_minutes'], $cfg['max_attempts'])
                ->by($request->ip())
                ->response(function () use ($request) {
                    Log::warning('rate_limit_hit', [
                        'type' => 'rate_limit',
                        'limiter' => 'invite_join',
                        'ip' => $request->ip(),
                        'path' => $request->path(),
                    ]);
                    return response()->json([
                        'error' => ['code' => 'RATE_LIMITED', 'message' => 'Too many requests.'],
                    ], 429);
                });
        });

        RateLimiter::for('stripe_webhook', function (Request $request) use ($limits) {
            $cfg = $limits['stripe_webhook'] ?? ['max_attempts' => 30, 'decay_minutes' => 1];
            return Limit::perMinutes($cfg['decay_minutes'], $cfg['max_attempts'])
                ->by($request->ip())
                ->response(function () use ($request) {
                    Log::warning('rate_limit_hit', [
                        'type' => 'rate_limit',
                        'limiter' => 'stripe_webhook',
                        'ip' => $request->ip(),
                        'path' => $request->path(),
                    ]);
                    return response()->json([
                        'error' => ['code' => 'RATE_LIMITED', 'message' => 'Too many requests.'],
                    ], 429);
                });
        });
    }
}
