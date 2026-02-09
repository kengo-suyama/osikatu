<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeProfile;
use App\Models\UserSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;

final class UserScheduleController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return $this->unauthorized();
        }

        $query = UserSchedule::query()->where('user_id', $user->id);

        $from = $request->query('from');
        $to = $request->query('to');

        if ($from) {
            $query->where('start_at', '>=', Carbon::parse($from));
        }
        if ($to) {
            $query->where('start_at', '<=', Carbon::parse($to)->endOfDay());
        }

        $search = $request->query('search');
        if ($search) {
            $query->where('title', 'like', '%' . $search . '%');
        }

        $items = $query->orderBy('start_at')->get();

        return response()->json([
            'success' => [
                'data' => [
                    'items' => $items->map(fn(UserSchedule $schedule) => $this->mapSchedule($schedule))->values(),
                ],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return $this->unauthorized();
        }

        $validator = $this->scheduleValidator($request->all());
        if ($validator->fails()) {
            return $this->validationError($validator->errors()->messages());
        }

        $data = $this->normalizePayload($request->all());

        $schedule = UserSchedule::create([
            'user_id' => $user->id,
            ...$data,
        ]);

        return response()->json([
            'success' => [
                'data' => $this->mapSchedule($schedule),
            ],
        ], 201);
    }

    public function update(Request $request, $scheduleId)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return $this->unauthorized();
        }

        $schedule = $this->findSchedule($scheduleId, $user->id);
        if (!$schedule) {
            return $this->notFound();
        }

        $validator = $this->scheduleValidator($request->all());
        if ($validator->fails()) {
            return $this->validationError($validator->errors()->messages());
        }

        $data = $this->normalizePayload($request->all());
        $schedule->update($data);

        return response()->json([
            'success' => [
                'data' => $this->mapSchedule($schedule),
            ],
        ]);
    }

    public function destroy(Request $request, $scheduleId)
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return $this->unauthorized();
        }

        $schedule = $this->findSchedule($scheduleId, $user->id);
        if (!$schedule) {
            return $this->notFound();
        }

        $schedule->delete();

        return response()->json([
            'success' => [
                'data' => ['deleted' => true],
            ],
        ]);
    }

    private function scheduleValidator(array $payload)
    {
        return Validator::make($payload, [
            'title' => ['required', 'string', 'max:120'],
            'startAt' => ['required', 'date'],
            'endAt' => ['nullable', 'date', 'after_or_equal:startAt'],
            'isAllDay' => ['sometimes', 'boolean'],
            'note' => ['nullable', 'string', 'max:1000'],
            'location' => ['nullable', 'string', 'max:120'],
            'remindAt' => ['nullable', 'date', 'after_or_equal:startAt'],
        ]);
    }

    private function normalizePayload(array $payload): array
    {
        return [
            'title' => $payload['title'],
            'start_at' => Carbon::parse($payload['startAt']),
            'end_at' => !empty($payload['endAt']) ? Carbon::parse($payload['endAt']) : null,
            'is_all_day' => $payload['isAllDay'] ?? false,
            'note' => $payload['note'] ?? null,
            'location' => $payload['location'] ?? null,
            'remind_at' => !empty($payload['remindAt']) ? Carbon::parse($payload['remindAt']) : null,
        ];
    }

    private function resolveUser(Request $request)
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return null;
        }
        $profile = MeProfile::where('device_id', $deviceId)->first();
        return $profile?->user;
    }

    private function mapSchedule(UserSchedule $schedule): array
    {
        return [
            'id' => "us_{$schedule->id}",
            'title' => $schedule->title,
            'startAt' => $schedule->start_at->toIso8601String(),
            'endAt' => $schedule->end_at?->toIso8601String(),
            'isAllDay' => $schedule->is_all_day,
            'note' => $schedule->note,
            'location' => $schedule->location,
            'remindAt' => $schedule->remind_at?->toIso8601String(),
            'updatedAt' => $schedule->updated_at->toIso8601String(),
        ];
    }

    private function findSchedule($identifier, int $userId): ?UserSchedule
    {
        $id = $this->normalizeId($identifier);
        return UserSchedule::where('id', $id)->where('user_id', $userId)->first();
    }

    private function normalizeId(string $value): int
    {
        return (int)str_replace('us_', '', $value);
    }

    private function unauthorized()
    {
        return response()->json([
            'error' => [
                'code' => 'UNAUTHORIZED',
                'message' => '認証に失敗しました',
            ],
        ], 401);
    }

    private function notFound()
    {
        return response()->json([
            'error' => [
                'code' => 'NOT_FOUND',
                'message' => '予定が見つかりません',
            ],
        ], 404);
    }

    private function validationError(array $details)
    {
        return response()->json([
            'error' => [
                'code' => 'VALIDATION_ERROR',
                'message' => '入力が不正です',
                'details' => $details,
            ],
        ], 422);
    }
}
