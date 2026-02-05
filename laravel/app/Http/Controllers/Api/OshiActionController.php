<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OshiActionLog;
use App\Models\TitleAward;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\OshiActionPool;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OshiActionController extends Controller
{
    public function today(Request $request)
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
        }

        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $dateKey = $this->todayKey();
        $log = OshiActionLog::query()
            ->where('user_id', $user->id)
            ->where('date_key', $dateKey)
            ->first();

        if (!$log) {
            $actionText = $this->pickAction($deviceId, $dateKey);
            if (!$actionText) {
                return ApiResponse::error('ACTION_UNAVAILABLE', 'No action available.', null, 503);
            }

            $log = OshiActionLog::create([
                'user_id' => $user->id,
                'date_key' => $dateKey,
                'action_text' => $actionText,
                'completed_at' => null,
            ]);
        }

        return ApiResponse::success([
            'dateKey' => $log->date_key,
            'actionText' => $log->action_text,
            'completed' => $log->completed_at !== null,
            'completedAt' => $log->completed_at?->toIso8601String(),
            'currentTitleId' => $user->current_title_id,
            'actionTotal' => (int) ($user->oshi_action_total ?? 0),
            'streak' => (int) ($user->oshi_action_streak ?? 0),
        ]);
    }

    public function complete(Request $request)
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
        }

        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $validator = Validator::make($request->all(), [
            'dateKey' => ['required', 'date_format:Y-m-d'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $dateKey = $data['dateKey'];

        $log = OshiActionLog::query()
            ->where('user_id', $user->id)
            ->where('date_key', $dateKey)
            ->first();

        if (!$log) {
            $actionText = $this->pickAction($deviceId, $dateKey);
            if (!$actionText) {
                return ApiResponse::error('ACTION_UNAVAILABLE', 'No action available.', null, 503);
            }

            $log = OshiActionLog::create([
                'user_id' => $user->id,
                'date_key' => $dateKey,
                'action_text' => $actionText,
                'completed_at' => null,
            ]);
        }

        if ($log->completed_at) {
            return ApiResponse::success($this->buildCompletionPayload($user, $log, null, []));
        }

        $log->completed_at = now();
        $log->save();

        $milestones = [1, 3, 7, 14, 30, 60, 100];
        $today = Carbon::createFromFormat('Y-m-d', $dateKey, 'Asia/Tokyo')->startOfDay();
        $lastDate = $user->oshi_action_last_date
            ? Carbon::parse($user->oshi_action_last_date)->startOfDay()
            : null;

        $nextStreak = 1;
        if ($lastDate) {
            $diffDays = $lastDate->diffInDays($today, false);
            if ($diffDays === 1) {
                $nextStreak = (int) ($user->oshi_action_streak ?? 0) + 1;
            } elseif ($diffDays === 0) {
                $nextStreak = (int) ($user->oshi_action_streak ?? 1);
            }
        }

        $nextTotal = (int) ($user->oshi_action_total ?? 0) + 1;
        $awardedTitleId = $this->titleIdFromCount($nextTotal);

        $user->oshi_action_total = $nextTotal;
        $user->oshi_action_streak = $nextStreak;
        $user->oshi_action_last_date = $today->toDateString();
        $user->current_title_id = $awardedTitleId;
        $user->save();

        $awards = [];
        $awards[] = TitleAward::create([
            'user_id' => $user->id,
            'title_id' => $awardedTitleId,
            'reason' => 'action',
            'meta' => ['total' => $nextTotal],
            'awarded_at' => now(),
        ]);

        if (in_array($nextStreak, $milestones, true)) {
            $awards[] = TitleAward::create([
                'user_id' => $user->id,
                'title_id' => $this->titleIdFromCount($nextStreak),
                'reason' => 'streak',
                'meta' => ['milestone' => $nextStreak],
                'awarded_at' => now(),
            ]);
        }

        if (in_array($nextTotal, $milestones, true)) {
            $awards[] = TitleAward::create([
                'user_id' => $user->id,
                'title_id' => $this->titleIdFromCount($nextTotal),
                'reason' => 'days_total',
                'meta' => ['milestone' => $nextTotal],
                'awarded_at' => now(),
            ]);
        }

        return ApiResponse::success($this->buildCompletionPayload($user, $log, $awardedTitleId, $awards));
    }

    public function titles(Request $request)
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $awards = TitleAward::query()
            ->where('user_id', $user->id)
            ->orderByDesc('awarded_at')
            ->limit(200)
            ->get();

        return ApiResponse::success([
            'currentTitleId' => $user->current_title_id,
            'actionTotal' => (int) ($user->oshi_action_total ?? 0),
            'streak' => (int) ($user->oshi_action_streak ?? 0),
            'awards' => $awards->map(fn (TitleAward $award) => [
                'id' => $award->id,
                'titleId' => $award->title_id,
                'reason' => $award->reason,
                'meta' => $award->meta ?? (object) [],
                'awardedAt' => $award->awarded_at?->toIso8601String(),
            ])->values(),
        ]);
    }

    private function todayKey(): string
    {
        return now('Asia/Tokyo')->toDateString();
    }

    private function pickAction(string $deviceId, string $dateKey): ?string
    {
        $pool = OshiActionPool::all();
        if (empty($pool)) {
            return null;
        }

        $seed = $this->hashSeed($deviceId . '|' . $dateKey);
        $index = $seed % count($pool);
        return $pool[$index] ?? $pool[0];
    }

    private function hashSeed(string $value): int
    {
        $hash = 2166136261;
        $len = strlen($value);
        for ($i = 0; $i < $len; $i += 1) {
            $hash ^= ord($value[$i]);
            $hash = ($hash * 16777619) & 0xffffffff;
        }
        return $hash;
    }

    private function titleIdFromCount(int $count): string
    {
        $index = max(1, min($count, 1000));
        return 't' . str_pad((string) $index, 4, '0', STR_PAD_LEFT);
    }

    private function buildCompletionPayload(User $user, OshiActionLog $log, ?string $awardedTitleId, array $awards): array
    {
        return [
            'dateKey' => $log->date_key,
            'actionText' => $log->action_text,
            'completedAt' => $log->completed_at?->toIso8601String(),
            'awardedTitleId' => $awardedTitleId,
            'currentTitleId' => $user->current_title_id,
            'actionTotal' => (int) ($user->oshi_action_total ?? 0),
            'streak' => (int) ($user->oshi_action_streak ?? 0),
            'awards' => collect($awards)->map(fn (TitleAward $award) => [
                'id' => $award->id,
                'titleId' => $award->title_id,
                'reason' => $award->reason,
                'meta' => $award->meta ?? (object) [],
                'awardedAt' => $award->awarded_at?->toIso8601String(),
            ])->values(),
        ];
    }
}
