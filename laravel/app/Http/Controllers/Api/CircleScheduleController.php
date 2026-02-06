<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\CircleSchedule;
use App\Models\CircleScheduleParticipant;
use App\Models\MeProfile;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Collection;

class CircleScheduleController extends Controller
{
    public function index(Request $request, int $circle): JsonResponse
    {
        $guard = $this->requireMember($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $validator = Validator::make($request->query(), [
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $from = $request->query('from');
        $to = $request->query('to');

        $query = CircleSchedule::query()->where('circle_id', $circle);
        if ($from) {
            $fromDate = Carbon::parse($from)->startOfDay();
            $query->where('start_at', '>=', $fromDate);
        }
        if ($to) {
            $toDate = Carbon::parse($to)->endOfDay();
            $query->where('start_at', '<=', $toDate);
        }

        $items = $query->orderBy('start_at')->orderBy('id')->get();
        $participants = $this->loadParticipants($items);

        return ApiResponse::success([
            'items' => $items->map(fn(CircleSchedule $schedule) => $this->mapSchedule($schedule, $participants))->values(),
        ]);
    }

    public function show(Request $request, int $circle, string $schedule): JsonResponse
    {
        $guard = $this->requireMember($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $id = $this->parseScheduleId($schedule);
        if (!$id) {
            return ApiResponse::error('NOT_FOUND', 'Schedule not found.', null, 404);
        }

        $model = CircleSchedule::query()
            ->where('circle_id', $circle)
            ->where('id', $id)
            ->first();

        if (!$model) {
            return ApiResponse::error('NOT_FOUND', 'Schedule not found.', null, 404);
        }

        $participants = $this->loadParticipants(collect([$model]));

        return ApiResponse::success($this->mapSchedule($model, $participants));
    }

    public function store(Request $request, int $circle): JsonResponse
    {
        $guard = $this->requireWriter($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:120'],
            'startAt' => ['required', 'date'],
            'endAt' => ['nullable', 'date', 'after_or_equal:startAt'],
            'isAllDay' => ['nullable', 'boolean'],
            'note' => ['nullable', 'string', 'max:2000'],
            'location' => ['nullable', 'string', 'max:120'],
            'participantUserIds' => ['nullable', 'array', 'max:100'],
            'participantUserIds.*' => ['integer'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $startAt = $data['startAt'];
        $endAt = $data['endAt'] ?? $startAt;

        $schedule = CircleSchedule::create([
            'circle_id' => $circle,
            'created_by' => $guard['member']->user_id,
            'title' => $data['title'],
            'start_at' => $startAt,
            'end_at' => $endAt,
            'is_all_day' => (bool) ($data['isAllDay'] ?? false),
            'note' => $data['note'] ?? null,
            'location' => $data['location'] ?? null,
            'visibility' => 'members',
        ]);

        $participantIds = $this->resolveParticipantIds($circle, $data['participantUserIds'] ?? null);
        if ($participantIds === null) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'participantUserIds' => ['Participants must belong to circle.'],
            ], 422);
        }

        foreach ($participantIds as $userId) {
            CircleScheduleParticipant::create([
                'circle_schedule_id' => $schedule->id,
                'user_id' => $userId,
                'status' => 'accepted',
            ]);
        }

        $participants = $this->loadParticipants(collect([$schedule]));

        return ApiResponse::success($this->mapSchedule($schedule, $participants), null, 201);
    }

    public function update(Request $request, int $circle, string $schedule): JsonResponse
    {
        $guard = $this->requireWriter($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $id = $this->parseScheduleId($schedule);
        if (!$id) {
            return ApiResponse::error('NOT_FOUND', 'Schedule not found.', null, 404);
        }

        $model = CircleSchedule::query()
            ->where('circle_id', $circle)
            ->where('id', $id)
            ->first();

        if (!$model) {
            return ApiResponse::error('NOT_FOUND', 'Schedule not found.', null, 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:120'],
            'startAt' => ['required', 'date'],
            'endAt' => ['nullable', 'date', 'after_or_equal:startAt'],
            'isAllDay' => ['nullable', 'boolean'],
            'note' => ['nullable', 'string', 'max:2000'],
            'location' => ['nullable', 'string', 'max:120'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $startAt = $data['startAt'];
        $endAt = $data['endAt'] ?? $startAt;

        $model->title = $data['title'];
        $model->start_at = $startAt;
        $model->end_at = $endAt;
        $model->is_all_day = (bool) ($data['isAllDay'] ?? false);
        $model->note = $data['note'] ?? null;
        $model->location = $data['location'] ?? null;
        $model->save();

        $participants = $this->loadParticipants(collect([$model]));

        return ApiResponse::success($this->mapSchedule($model, $participants));
    }

    public function destroy(Request $request, int $circle, string $schedule): JsonResponse
    {
        $guard = $this->requireWriter($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $id = $this->parseScheduleId($schedule);
        if (!$id) {
            return ApiResponse::error('NOT_FOUND', 'Schedule not found.', null, 404);
        }

        $model = CircleSchedule::query()
            ->where('circle_id', $circle)
            ->where('id', $id)
            ->first();

        if (!$model) {
            return ApiResponse::error('NOT_FOUND', 'Schedule not found.', null, 404);
        }

        $model->delete();

        return ApiResponse::success(['deleted' => true]);
    }

    private function requireMember(Request $request, int $circle): array|JsonResponse
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $profile = MeProfile::query()->where('device_id', $deviceId)->first();
        if (!$profile || !$profile->user_id) {
            // Hide circle existence from unknown devices / non-members (security-by-default; aligns with tests).
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circle)
            ->where('user_id', $profile->user_id)
            ->first();

        if (!$member) {
            // Hide circle existence from non-members (align with CircleSchedulesTest expectation).
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        return [
            'circle' => $circleModel,
            'member' => $member,
        ];
    }

    private function requireWriter(Request $request, int $circle): array|JsonResponse
    {
        $guard = $this->requireMember($request, $circle);
        if ($guard instanceof JsonResponse) {
            return $guard;
        }

        $circleModel = $guard['circle'];
        $member = $guard['member'];

        $plan = $circleModel->plan ?? 'free';
        $isPremium = in_array($plan, ['premium', 'plus'], true);
        $isManager = in_array($member->role, ['owner', 'admin'], true);

        if (!$isPremium || !$isManager) {
            return ApiResponse::error('FORBIDDEN', 'Premium owner/admin only.', null, 403);
        }

        return $guard;
    }

    private function parseScheduleId(string $schedule): ?int
    {
        if (str_starts_with($schedule, 'cs_')) {
            $schedule = substr($schedule, 3);
        }

        if (!ctype_digit($schedule)) {
            return null;
        }

        $id = (int) $schedule;
        return $id > 0 ? $id : null;
    }

    private function resolveParticipantIds(int $circleId, ?array $participantUserIds): ?array
    {
        $members = CircleMember::query()
            ->where('circle_id', $circleId)
            ->pluck('user_id')
            ->all();

        if (empty($participantUserIds)) {
            return $members;
        }

        $participantUserIds = array_values(array_unique(array_map('intval', $participantUserIds)));
        $valid = array_values(array_intersect($participantUserIds, $members));

        if (count($valid) !== count($participantUserIds)) {
            return null;
        }

        return $valid;
    }

    private function loadParticipants(Collection $schedules): array
    {
        $ids = $schedules->pluck('id')->all();
        if (empty($ids)) {
            return [];
        }

        $rows = CircleScheduleParticipant::query()
            ->whereIn('circle_schedule_id', $ids)
            ->get()
            ->groupBy('circle_schedule_id');

        return $rows->all();
    }

    private function mapSchedule(CircleSchedule $schedule, array $participantsMap): array
    {
        $tz = 'Asia/Tokyo';
        $participants = $participantsMap[$schedule->id] ?? collect();

        return [
            'id' => 'cs_' . $schedule->id,
            'circleId' => $schedule->circle_id,
            'title' => $schedule->title,
            'startAt' => $schedule->start_at?->setTimezone($tz)->toIso8601String(),
            'endAt' => $schedule->end_at?->setTimezone($tz)->toIso8601String(),
            'isAllDay' => (bool) $schedule->is_all_day,
            'note' => $schedule->note,
            'location' => $schedule->location,
            'participants' => collect($participants)->map(fn(CircleScheduleParticipant $participant) => [
                'userId' => $participant->user_id,
                'status' => $participant->status,
                'readAt' => $participant->read_at?->setTimezone($tz)->toIso8601String(),
            ])->values(),
            'updatedAt' => $schedule->updated_at?->setTimezone($tz)->toIso8601String(),
        ];
    }
}
