<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\InsufficientCirclePointsException;
use App\Http\Controllers\Controller;
use App\Models\Circle;
use App\Models\CircleGachaDraw;
use App\Models\CircleMember;
use App\Models\UserUnlock;
use App\Services\CirclePointsService;
use App\Services\GachaService;
use App\Support\ApiResponse;
use App\Support\MeProfileResolver;
use App\Support\OperationLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CircleGachaController extends Controller
{
    public function points(Request $request, Circle $circle)
    {
        $deviceId = trim((string) $request->header('X-Device-Id', ''));
        if ($deviceId === '') {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $profile = MeProfileResolver::resolve($deviceId);
        if (!$profile?->user_id) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circle->id)
            ->where('user_id', $profile->user_id)
            ->first();

        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a member.', null, 403);
        }

        $balance = CirclePointsService::balance($circle->id);

        return ApiResponse::success(['balance' => $balance]);
    }

    public function draw(Request $request, Circle $circle)
    {
        $deviceId = trim((string) $request->header('X-Device-Id', ''));
        if ($deviceId === '') {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $profile = MeProfileResolver::resolve($deviceId);
        $userId = $profile?->user_id;
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circle->id)
            ->where('user_id', $userId)
            ->first();

        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a member.', null, 403);
        }

        $cost = (int) config('gacha.circle_cost', 100);
        if ($cost <= 0) {
            $cost = 100;
        }

        $requestId = trim((string) ($request->header('X-Request-Id') ?? ''));
        $requestId = $requestId !== '' ? $requestId : null;

        try {
            CirclePointsService::deduct($circle->id, $userId, $cost, 'circle_gacha_draw', [
                'source' => 'gacha',
                'cost' => $cost,
                'request_id' => $requestId,
            ]);

            $prize = GachaService::draw('circle:global');

            $draw = CircleGachaDraw::create([
                'circle_id' => $circle->id,
                'actor_user_id' => $userId,
                'cost_points' => $cost,
                'reward_key' => $prize['itemKey'],
                'reward_rarity' => $prize['rarity'],
                'meta' => [
                    'itemType' => $prize['itemType'],
                    'request_id' => $requestId,
                ],
            ]);

            $unlock = UserUnlock::firstOrCreate(
                [
                    'user_id' => $userId,
                    'item_type' => $prize['itemType'],
                    'item_key' => $prize['itemKey'],
                ],
                [
                    'rarity' => $prize['rarity'],
                    'source' => 'circle_gacha',
                    'acquired_at' => now(),
                ]
            );

            $balance = CirclePointsService::balance($circle->id);

            OperationLogService::log($request, 'circle_gacha_drawn', $circle->id, [
                'cost' => $cost,
                'reward_key' => $prize['itemKey'],
                'reward_rarity' => $prize['rarity'],
                'item_type' => $prize['itemType'],
                'is_new' => $unlock->wasRecentlyCreated,
            ]);

            Log::info('circle_gacha_draw', [
                'result' => 'ok',
                'circle_id' => $circle->id,
                'user_id' => $userId,
                'cost' => $cost,
                'reward_key' => $prize['itemKey'],
                'request_id' => $requestId,
            ]);

            return ApiResponse::success([
                'cost' => $cost,
                'balance' => $balance,
                'prize' => [
                    'itemType' => $prize['itemType'],
                    'itemKey' => $prize['itemKey'],
                    'rarity' => $prize['rarity'],
                    'isNew' => (bool) $unlock->wasRecentlyCreated,
                ],
            ]);
        } catch (InsufficientCirclePointsException $e) {
            Log::info('circle_gacha_draw', [
                'result' => 'insufficient_points',
                'circle_id' => $circle->id,
                'user_id' => $userId,
                'balance' => $e->balance,
                'required' => $e->required,
            ]);

            return ApiResponse::error('INSUFFICIENT_CIRCLE_POINTS', 'Not enough circle points.', [
                'required' => $e->required,
                'balance' => $e->balance,
            ], 409);
        }
    }
}
