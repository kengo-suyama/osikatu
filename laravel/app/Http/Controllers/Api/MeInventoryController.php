<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Oshi;
use App\Models\PointsTransaction;
use App\Models\User;
use App\Models\UserUnlock;
use App\Support\ApiResponse;
use App\Support\MeProfileResolver;
use App\Support\OperationLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class MeInventoryController extends Controller
{
    public function index(Request $request)
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

        $items = UserUnlock::query()
            ->where('user_id', $user->id)
            ->orderByDesc('acquired_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        // Provide a current personal points balance to drive UX (optional; keeps one request).
        $balance = (int) PointsTransaction::query()
            ->where('user_id', $user->id)
            ->whereNull('circle_id')
            ->sum('delta');

        return ApiResponse::success([
            'balance' => $balance,
            'items' => $items->map(fn (UserUnlock $u) => [
                'id' => $u->id,
                'itemType' => $u->item_type,
                'itemKey' => $u->item_key,
                'rarity' => $u->rarity,
                'source' => $u->source,
                'acquiredAt' => $u->acquired_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    public function apply(Request $request)
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

        $validator = Validator::make($request->all(), [
            'itemType' => ['required', 'string', 'in:frame,theme'],
            'itemKey' => ['required', 'string', 'max:64'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $itemType = (string) $data['itemType'];
        $itemKey = (string) $data['itemKey'];

        $unlock = UserUnlock::query()
            ->where('user_id', $user->id)
            ->where('item_type', $itemType)
            ->where('item_key', $itemKey)
            ->first();

        if (!$unlock) {
            return ApiResponse::error('INVENTORY_NOT_OWNED', 'Item not owned.', null, 404);
        }

        $requestId = (string) ($request->header('X-Request-Id') ?? '');
        $requestId = trim($requestId) !== '' ? $requestId : null;

        $logCtx = [
            'result' => 'unknown',
            'user_id' => $user->id,
            'item_type' => $itemType,
            'item_key' => $itemKey,
            'request_id' => $requestId,
        ];

        try {
            if ($itemType === 'theme') {
                $user->ui_theme_id = $itemKey;
                $user->save();

                OperationLogService::log($request, 'inventory.apply', null, [
                    'themeId' => $itemKey,
                    'source' => 'inventory',
                ]);

                $logCtx['result'] = 'ok';
                Log::info('inventory_apply', $logCtx);

                return ApiResponse::success([
                    'applied' => [
                        'themeId' => $user->ui_theme_id,
                    ],
                ]);
            }

            $oshi = Oshi::query()
                ->where('user_id', $user->id)
                ->where('is_primary', true)
                ->orderByDesc('id')
                ->first();

            if (!$oshi) {
                return ApiResponse::error('OSHI_REQUIRED', 'Primary oshi is required to apply a frame.', null, 409);
            }

            $oshi->image_frame_id = $itemKey;
            $oshi->save();

            OperationLogService::log($request, 'inventory.apply', null, [
                'frameId' => $itemKey,
                'source' => 'inventory',
            ]);

            $logCtx['result'] = 'ok';
            Log::info('inventory_apply', $logCtx);

            return ApiResponse::success([
                'applied' => [
                    'oshiId' => $oshi->id,
                    'imageFrameId' => $oshi->image_frame_id,
                ],
            ]);
        } catch (\Throwable $e) {
            $logCtx['result'] = 'error';
            $logCtx['error'] = $e->getMessage();
            Log::error('inventory_apply', $logCtx);
            throw $e;
        }
    }
}

