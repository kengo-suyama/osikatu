<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PointsTransaction;
use App\Models\User;
use App\Services\PointsService;
use App\Support\ApiResponse;
use App\Support\MeProfileResolver;
use App\Support\OperationLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;

class MePointsEarnController extends Controller
{
    public function earn(Request $request)
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
            'reason' => ['required', 'string', 'in:share_copy,daily_login'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $reason = (string) $data['reason'];
        $requestId = (string) ($request->header('X-Request-Id') ?? '');
        $requestId = trim($requestId) !== '' ? $requestId : null;

        $delta = match ($reason) {
            'share_copy' => 5,
            'daily_login' => 3,
            default => 0,
        };

        $logCtx = [
            'result' => 'unknown',
            'user_id' => $user->id,
            'reason' => $reason,
            'delta' => $delta,
            'request_id' => $requestId,
        ];

        try {
            if ($reason === 'share_copy') {
                $limitKey = "points:earn:share_copy:user:{$user->id}";
                if (RateLimiter::tooManyAttempts($limitKey, 5)) {
                    $logCtx['result'] = 'rate_limited';
                    Log::warning('points_earn', $logCtx);
                    return ApiResponse::error('RATE_LIMITED', 'Too many requests.', null, 429);
                }
                RateLimiter::hit($limitKey, 60);
            }

            if ($reason === 'daily_login') {
                $todayKey = Carbon::now('Asia/Tokyo')->toDateString();
                $idem = "earn:daily_login:{$todayKey}";
                $already = PointsTransaction::query()
                    ->where('user_id', $user->id)
                    ->whereNull('circle_id')
                    ->where('idempotency_key', $idem)
                    ->exists();
                if ($already) {
                    $balance = (int) PointsTransaction::query()
                        ->where('user_id', $user->id)
                        ->whereNull('circle_id')
                        ->sum('delta');

                    $logCtx['result'] = 'already_earned';
                    Log::info('points_earn', $logCtx);
                    return ApiResponse::success([
                        'earned' => false,
                        'delta' => 0,
                        'balance' => $balance,
                    ]);
                }

                PointsService::add(
                    $user->id,
                    null,
                    $delta,
                    $reason,
                    ['source' => 'me'],
                    $requestId,
                    $idem
                );
            } else {
                $idem = $requestId ? "earn:{$reason}:{$requestId}" : null;
                PointsService::add(
                    $user->id,
                    null,
                    $delta,
                    $reason,
                    ['source' => 'me'],
                    $requestId,
                    $idem
                );
            }

            $balance = (int) PointsTransaction::query()
                ->where('user_id', $user->id)
                ->whereNull('circle_id')
                ->sum('delta');

            OperationLogService::log($request, 'points.earn', null, [
                'source' => 'me',
                'reasonCode' => $reason,
            ]);

            $logCtx['result'] = 'earned';
            Log::info('points_earn', $logCtx);

            return ApiResponse::success([
                'earned' => true,
                'delta' => $delta,
                'balance' => $balance,
            ]);
        } catch (\Throwable $e) {
            $logCtx['result'] = 'error';
            $logCtx['error'] = $e->getMessage();
            Log::error('points_earn', $logCtx);
            throw $e;
        }
    }
}

