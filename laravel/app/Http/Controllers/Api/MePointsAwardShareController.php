<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PointsTransaction;
use App\Models\User;
use App\Services\PointsService;
use App\Support\ApiResponse;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class MePointsAwardShareController extends Controller
{
    public function store(Request $request)
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

        $user = User::query()->find($userId);
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $todayKey = Carbon::now('Asia/Tokyo')->toDateString();
        $idem = "award_share:{$todayKey}";

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

            Log::info('points_award_share', [
                'result' => 'already_awarded',
                'user_id' => $user->id,
            ]);

            return ApiResponse::error(
                'ALREADY_AWARDED_TODAY',
                'Share reward already awarded today.',
                ['balance' => $balance],
                409
            );
        }

        $delta = 5;
        PointsService::add(
            $user->id,
            null,
            $delta,
            'award_share',
            ['source' => 'share_panel'],
            null,
            $idem
        );

        $balance = (int) PointsTransaction::query()
            ->where('user_id', $user->id)
            ->whereNull('circle_id')
            ->sum('delta');

        Log::info('points_award_share', [
            'result' => 'awarded',
            'user_id' => $user->id,
            'delta' => $delta,
            'balance' => $balance,
        ]);

        return ApiResponse::success([
            'awarded' => true,
            'delta' => $delta,
            'balance' => $balance,
        ]);
    }
}
