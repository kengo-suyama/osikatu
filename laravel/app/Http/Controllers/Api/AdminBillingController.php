<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WebhookEventReceipt;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminBillingController extends Controller
{
    public function webhookSummary(Request $request): JsonResponse
    {
        $enabled = (bool) config('billing.debug_enabled', false);
        if (!app()->environment('local') && !app()->environment('testing') && !$enabled) {
            return ApiResponse::error('FORBIDDEN', 'Debug endpoint is disabled.', null, 403);
        }

        $hours = min(168, max(1, (int) ($request->query('hours') ?? 24)));
        $since = now()->subHours($hours);

        $total = WebhookEventReceipt::where('created_at', '>=', $since)->count();
        $success = WebhookEventReceipt::where('created_at', '>=', $since)
            ->where('status', 'processed')
            ->count();
        $failed = WebhookEventReceipt::where('created_at', '>=', $since)
            ->where('status', 'failed')
            ->count();
        $other = $total - $success - $failed;

        $failureRate = $total > 0 ? round(($failed / $total) * 100, 2) : 0.0;

        $recentFailures = WebhookEventReceipt::where('created_at', '>=', $since)
            ->where('status', 'failed')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn(WebhookEventReceipt $r) => [
                'id' => $r->id,
                'stripeEventId' => $r->stripe_event_id,
                'eventType' => $r->event_type,
                'createdAt' => $r->created_at?->toIso8601String(),
            ])
            ->values();

        return ApiResponse::success([
            'hours' => $hours,
            'total' => $total,
            'success' => $success,
            'failed' => $failed,
            'other' => $other,
            'failureRate' => $failureRate,
            'recentFailures' => $recentFailures,
        ]);
    }
}
