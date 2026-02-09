<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WebhookEventReceipt;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class WebhookReceiptController extends Controller
{
    public function index(Request $request)
    {
        // Admin check via header (simple guard - production should use proper auth)
        $adminKey = (string) config('billing.debug_enabled', false);
        if (!app()->environment('local', 'testing') && !$adminKey) {
            return ApiResponse::error('FORBIDDEN', 'Admin access required.', null, 403);
        }

        $limit = min(50, max(1, (int) ($request->query('limit') ?? 20)));
        $status = $request->query('status');
        $eventType = $request->query('event_type');

        $query = WebhookEventReceipt::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($status && is_string($status)) {
            $query->where('status', $status);
        }

        if ($eventType && is_string($eventType)) {
            $query->where('event_type', $eventType);
        }

        $items = $query->limit($limit + 1)->get();
        $hasMore = $items->count() > $limit;
        $slice = $items->take($limit);

        return ApiResponse::success([
            'items' => $slice->map(fn ($r) => [
                'id' => $r->id,
                'stripeEventId' => $r->stripe_event_id,
                'eventType' => $r->event_type,
                'status' => $r->status,
                'createdAt' => $r->created_at?->toIso8601String(),
            ])->values(),
            'hasMore' => $hasMore,
        ]);
    }

    public function show(Request $request, int $id)
    {
        $adminKey = (string) config('billing.debug_enabled', false);
        if (!app()->environment('local', 'testing') && !$adminKey) {
            return ApiResponse::error('FORBIDDEN', 'Admin access required.', null, 403);
        }

        $receipt = WebhookEventReceipt::query()->find($id);
        if (!$receipt) {
            return ApiResponse::error('NOT_FOUND', 'Receipt not found.', null, 404);
        }

        return ApiResponse::success([
            'id' => $receipt->id,
            'stripeEventId' => $receipt->stripe_event_id,
            'eventType' => $receipt->event_type,
            'status' => $receipt->status,
            'createdAt' => $receipt->created_at?->toIso8601String(),
            'updatedAt' => $receipt->updated_at?->toIso8601String(),
        ]);
    }
}
