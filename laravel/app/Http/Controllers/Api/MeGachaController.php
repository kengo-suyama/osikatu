<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\InsufficientPointsException;
use App\Http\Controllers\Controller;
use App\Models\GachaLog;
use App\Models\PointsTransaction;
use App\Models\User;
use App\Models\UserUnlock;
use App\Services\GachaService;
use App\Support\ApiResponse;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MeGachaController extends Controller
{
    public function pull(Request $request)
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

        $cost = (int) config('gacha.cost', 100);
        if ($cost <= 0) {
            $cost = 100;
        }

        $requestId = (string) ($request->header('X-Request-Id') ?? '');
        $requestId = trim($requestId) !== '' ? $requestId : null;

        try {
            $out = DB::transaction(function () use ($user, $cost, $requestId): array {
                // Serialize per-user pulls to prevent double-spend races.
                User::query()->whereKey($user->id)->lockForUpdate()->first();

                $balance = (int) PointsTransaction::query()
                    ->where('user_id', $user->id)
                    ->whereNull('circle_id')
                    ->sum('delta');

                if ($balance < $cost) {
                    throw new InsufficientPointsException($balance, $cost);
                }

                PointsTransaction::create([
                    'user_id' => $user->id,
                    'circle_id' => null,
                    'delta' => -$cost,
                    'reason' => 'gacha_pull_cost',
                    'source_meta' => [
                        'source' => 'gacha',
                        'cost' => $cost,
                    ],
                    'request_id' => $requestId,
                    'idempotency_key' => null,
                ]);

                $prize = GachaService::draw('default');

                $unlock = UserUnlock::firstOrCreate(
                    [
                        'user_id' => $user->id,
                        'item_type' => $prize['itemType'],
                        'item_key' => $prize['itemKey'],
                    ],
                    [
                        'rarity' => $prize['rarity'],
                        'source' => 'gacha',
                        'acquired_at' => now(),
                    ]
                );

                GachaLog::create([
                    'user_id' => $user->id,
                    'item_type' => $prize['itemType'],
                    'item_key' => $prize['itemKey'],
                    'rarity' => $prize['rarity'],
                    'is_new' => $unlock->wasRecentlyCreated,
                    'points_cost' => $cost,
                ]);

                return [
                    'cost' => $cost,
                    'balance' => $balance - $cost,
                    'prize' => [
                        'itemType' => $prize['itemType'],
                        'itemKey' => $prize['itemKey'],
                        'rarity' => $prize['rarity'],
                        'isNew' => (bool) $unlock->wasRecentlyCreated,
                    ],
                ];
            });

            Log::info('gacha_pull', [
                'result' => 'ok',
                'user_id' => $user->id,
                'cost' => $out['cost'],
                'request_id' => $requestId,
                'prize' => $out['prize']['itemKey'] ?? null,
                'rarity' => $out['prize']['rarity'] ?? null,
            ]);

            return ApiResponse::success($out);
        } catch (InsufficientPointsException $e) {
            Log::info('gacha_pull', [
                'result' => 'insufficient_points',
                'user_id' => $user->id,
                'balance' => $e->balance,
                'required' => $e->required,
                'request_id' => $requestId,
            ]);

            return ApiResponse::error('POINTS_INSUFFICIENT', 'Not enough points.', [
                'required' => $e->required,
                'balance' => $e->balance,
            ], 409);
        }
    }

    public function history(Request $request)
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

        $perPage = min((int) ($request->query('per_page', '20')), 100);

        $logs = GachaLog::query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $items = $logs->map(function (GachaLog $log) {
            return [
                'id' => $log->id,
                'itemType' => $log->item_type,
                'itemKey' => $log->item_key,
                'rarity' => $log->rarity,
                'isNew' => (bool) $log->is_new,
                'pointsCost' => $log->points_cost,
                'createdAt' => $log->created_at?->toIso8601String(),
            ];
        })->values();

        return ApiResponse::success([
            'items' => $items,
            'nextCursor' => $logs->hasMorePages() ? (string) ($logs->currentPage() + 1) : null,
            'total' => $logs->total(),
        ]);
    }
}
