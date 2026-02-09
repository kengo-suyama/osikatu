<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OperationLog;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Illuminate\Http\Request;

class OperationLogDrilldownController extends Controller
{
    public function byRequestId(Request $request)
    {
        $userId = CurrentUser::id();
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $requestId = $request->query('request_id');
        if (!$requestId || !is_string($requestId) || trim($requestId) === '') {
            return ApiResponse::error('VALIDATION_ERROR', 'request_id query parameter is required.', null, 422);
        }

        $logs = OperationLog::query()
            ->where('user_id', $userId)
            ->where('meta->request_id', trim($requestId))
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return ApiResponse::success([
            'request_id' => trim($requestId),
            'count' => $logs->count(),
            'items' => $logs->map(fn ($log) => [
                'id' => 'lg_' . (string) $log->id,
                'action' => $log->action,
                'circleId' => $log->circle_id ? (string) $log->circle_id : null,
                'actorUserId' => $log->user_id,
                'meta' => $log->meta ?? (object) [],
                'createdAt' => $log->created_at?->toIso8601String(),
            ])->values(),
        ]);
    }
}
