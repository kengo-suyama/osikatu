<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\InsufficientPointsException;
use App\Http\Controllers\Controller;
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

        $idempotencyKey = $requestId ? "gacha_pull:{$requestId}" : null;

        // Idempotency: if same request_id was used, return cached result
        if ($idempotencyKey) {
            $existing = PointsTransaction::query()
                ->where('user_id', $user->id)
                ->whereNull('circle_id')
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                $balance = (int) PointsTransaction::query()
                    ->where('user_id', $user->id)
                    ->whereNull('circle_id')
                    ->sum('delta');

                $meta = is_array($existing->source_meta) ? $existing->source_meta : [];
                return ApiResponse::success([
                    'cost' => $meta['cost'] ?? $cost,
                    'balance' => $balance,
                    'prize' => [
                        'itemType' => $meta['itemType'] ?? 'frame',
                        'itemKey' => $meta['itemKey'] ?? 'unknown',
                        'rarity' => $meta['rarity'] ?? 'R',
                        'isNew' => $meta['isNew'] ?? false,
                    ],
                ]);
            }
        }

        try {
            $out = DB::transaction(function () use ($user, $cost, $requestId, $idempotencyKey): array {
                // Serialize per-user pulls to prevent double-spend races.
                User::query()->whereKey($user->id)->lockForUpdate()->first();

                $balance = (int) PointsTransaction::query()
                    ->where('user_id', $user->id)
                    ->whereNull('circle_id')
                    ->sum('delta');

                if ($balance < $cost) {
                    throw new InsufficientPointsException($balance, $cost);
                }

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

                $isNew = (bool) $unlock->wasRecentlyCreated;

                PointsTransaction::create([
                    'user_id' => $user->id,
                    'circle_id' => null,
                    'delta' => -$cost,
                    'reason' => 'gacha_pull_cost',
                    'source_meta' => [
                        'source' => 'gacha',
                        'cost' => $cost,
                        'itemType' => $prize['itemType'],
                        'itemKey' => $prize['itemKey'],
                        'rarity' => $prize['rarity'],
                        'isNew' => $isNew,
                    ],
                    'request_id' => $requestId,
                    'idempotency_key' => $idempotencyKey,
                ]);

                return [
                    'cost' => $cost,
                    'balance' => $balance - $cost,
                    'prize' => [
                        'itemType' => $prize['itemType'],
                        'itemKey' => $prize['itemKey'],
                        'rarity' => $prize['rarity'],
                        'isNew' => $isNew,
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
}
