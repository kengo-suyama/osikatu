<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RequestMetricsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        $response = $next($request);

        $durationMs = round((microtime(true) - $start) * 1000, 2);

        Log::info('request_metrics', [
            'type' => 'request_metrics',
            'method' => $request->method(),
            'path' => $request->path(),
            'status' => $response->getStatusCode(),
            'duration_ms' => $durationMs,
            'request_id' => $request->header('X-Request-Id'),
            'user_id' => $request->attributes->get('user_id'),
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 128),
            'content_length' => (int) $response->headers->get('Content-Length', '0'),
        ]);

        $response->headers->set('X-Response-Time', $durationMs . 'ms');

        return $response;
    }
}
