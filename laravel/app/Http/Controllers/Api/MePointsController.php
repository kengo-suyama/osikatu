<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PointsTransaction;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;

class MePointsController extends Controller
{
    public function show(Request $request)
    {
        $deviceId = (string) $request->header('X-Device-Id', '');
        $deviceId = trim($deviceId);
        if ($deviceId === '') {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $profile = MeProfileResolver::resolve($deviceId);
        $userId = $profile?->user_id;
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $user = User::query()->find($userId);
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        // Personal points: circle_id is null (circle points will be handled in later tasks).
        $balance = (int) PointsTransaction::query()
            ->where('user_id', $user->id)
            ->whereNull('circle_id')
            ->sum('delta');

        $items = PointsTransaction::query()
            ->where('user_id', $user->id)
            ->whereNull('circle_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        return ApiResponse::success([
            'balance' => $balance,
            'items' => $items->map(fn (PointsTransaction $tx) => [
                'id' => $tx->id,
                'circleId' => $tx->circle_id,
                'delta' => (int) $tx->delta,
                'reason' => $tx->reason,
                'sourceMeta' => $tx->source_meta,
                'requestId' => $tx->request_id,
                'createdAt' => $tx->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }
}

