<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeProfile;
use App\Models\Notification;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $userId = $this->resolveUserId($request);
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $validator = Validator::make($request->query(), [
            'cursor' => ['nullable', 'string'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'unread' => ['nullable', 'in:1'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $limit = (int) ($request->query('limit') ?? 20);
        $limit = max(1, min(50, $limit));
        $cursor = $this->parseNotificationId((string) ($request->query('cursor') ?? ''));
        $unread = $request->query('unread') === '1';

        $query = Notification::query()
            ->where('user_id', $userId)
            ->orderByDesc('id');

        if ($cursor) {
            $query->where('id', '<', $cursor);
        }

        if ($unread) {
            $query->whereNull('read_at');
        }

        $items = $query->limit($limit + 1)->get();
        $nextCursor = null;
        if ($items->count() > $limit) {
            $nextItem = $items->pop();
            $nextCursor = $nextItem?->id ? 'nt_' . $nextItem->id : null;
        }

        return ApiResponse::success([
            'items' => $items->map(fn(Notification $notification) => $this->mapNotification($notification))->values(),
            'nextCursor' => $nextCursor,
        ]);
    }

    public function read(Request $request, string $notification)
    {
        $userId = $this->resolveUserId($request);
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $id = $this->parseNotificationId($notification);
        if (!$id) {
            return ApiResponse::error('NOT_FOUND', 'Notification not found.', null, 404);
        }

        $model = Notification::query()
            ->where('id', $id)
            ->where('user_id', $userId)
            ->first();

        if (!$model) {
            return ApiResponse::error('NOT_FOUND', 'Notification not found.', null, 404);
        }

        if (!$model->read_at) {
            $model->read_at = Carbon::now('Asia/Tokyo');
            $model->save();
        }

        return ApiResponse::success($this->mapNotification($model));
    }

    private function mapNotification(Notification $notification): array
    {
        $tz = 'Asia/Tokyo';

        return [
            'id' => 'nt_' . $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'body' => $notification->body,
            'linkUrl' => $notification->link_url,
            'notifyAt' => $notification->notify_at?->setTimezone($tz)->toIso8601String(),
            'readAt' => $notification->read_at?->setTimezone($tz)->toIso8601String(),
            'createdAt' => $notification->created_at?->setTimezone($tz)->toIso8601String(),
            'sourceType' => $this->toCamelSourceType($notification->source_type),
            'sourceId' => $notification->source_id ? (int) $notification->source_id : null,
        ];
    }

    private function toCamelSourceType(?string $value): ?string
    {
        return match ($value) {
            'user_schedule' => 'userSchedule',
            'circle_schedule' => 'circleSchedule',
            default => $value,
        };
    }

    private function resolveUserId(Request $request): ?int
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return null;
        }

        $profile = MeProfile::query()->where('device_id', $deviceId)->first();
        if (!$profile || !$profile->user_id) {
            return null;
        }

        return (int) $profile->user_id;
    }

    private function parseNotificationId(string $notification): ?int
    {
        if (str_starts_with($notification, 'nt_')) {
            $notification = substr($notification, 3);
        }

        if (!ctype_digit($notification)) {
            return null;
        }

        $id = (int) $notification;
        return $id > 0 ? $id : null;
    }
}
