<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyFortune;
use App\Models\User;
use App\Services\FortuneService;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FortuneController extends Controller
{
    public function __construct(private FortuneService $fortuneService)
    {
    }

    public function today(Request $request)
    {
        $userId = CurrentUser::id();
        $user = User::query()->find($userId);
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'User not found.', null, 401);
        }

        $validator = Validator::make($request->query(), [
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Invalid date format.', [
                'errors' => $validator->errors()->messages(),
            ], 422);
        }

        $dateInput = $request->query('date');
        $date = $dateInput ? Carbon::createFromFormat('Y-m-d', $dateInput, 'Asia/Tokyo') : now('Asia/Tokyo');
        $fortune = $this->fortuneService->getOrCreate($user, $date);

        return ApiResponse::success([
            'date' => $fortune->fortune_date->toDateString(),
            'luckScore' => $fortune->luck_score,
            'luckyColor' => $fortune->lucky_color,
            'luckyItem' => $fortune->lucky_item,
            'message' => $fortune->message,
            'goodAction' => $fortune->good_action,
            'badAction' => $fortune->bad_action,
            'updatedAt' => $fortune->updated_at?->toIso8601String(),
        ]);
    }

    public function history(Request $request)
    {
        $userId = CurrentUser::id();
        $user = User::query()->find($userId);
        if (!$user) {
            return ApiResponse::error('UNAUTHORIZED', 'User not found.', null, 401);
        }

        $validator = Validator::make($request->query(), [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Invalid date range.', [
                'errors' => $validator->errors()->messages(),
            ], 422);
        }

        $fromInput = $request->query('from');
        $toInput = $request->query('to');
        $today = now('Asia/Tokyo')->startOfDay();
        $from = $fromInput
            ? Carbon::createFromFormat('Y-m-d', $fromInput, 'Asia/Tokyo')
            : $today->copy()->subDays(6);
        $to = $toInput ? Carbon::createFromFormat('Y-m-d', $toInput, 'Asia/Tokyo') : $today;

        if ($from->gt($to)) {
            return ApiResponse::error('VALIDATION_ERROR', 'from must be before to.', null, 422);
        }

        $items = $this->fortuneService->findInRange($user, $from, $to);

        return ApiResponse::success([
            'items' => $items->map(fn (DailyFortune $fortune) => [
                'date' => $fortune->fortune_date->toDateString(),
                'luckScore' => $fortune->luck_score,
                'luckyColor' => $fortune->lucky_color,
                'luckyItem' => $fortune->lucky_item,
                'message' => $fortune->message,
                'goodAction' => $fortune->good_action,
                'badAction' => $fortune->bad_action,
                'updatedAt' => $fortune->updated_at?->toIso8601String(),
            ])->toArray(),
        ]);
    }
}
