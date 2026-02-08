<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\OperationLog;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use App\Support\PlanGate;
use Carbon\Carbon;
use Illuminate\Http\Request;

class OperationLogController extends Controller
{
    public function myIndex(Request $request)
    {
        $userId = CurrentUser::id();
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        [$limit, $from, $to, $actionPrefix, $cursor, $requestId] = $this->parseQuery($request);

        $query = OperationLog::query()
            ->where('user_id', $userId);

        $this->applyFilters($query, $from, $to, $actionPrefix, $cursor, $requestId);

        $items = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit + 1)
            ->get();

        return $this->respondWithCursor($items, $limit);
    }

    public function circleIndex(Request $request, int $circle)
    {
        $deviceId = $request->header('X-Device-Id');
        if (!$deviceId) {
            return ApiResponse::error('DEVICE_ID_REQUIRED', 'X-Device-Id header is required', null, 400);
        }

        $circleModel = Circle::query()->where('id', $circle)->first();
        if (!$circleModel) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        if (!PlanGate::circleHasPlus($circleModel)) {
            return ApiResponse::error('PLAN_REQUIRED', 'Plus plan required to view circle logs.', [
                'requiredPlan' => 'plus',
            ], 402);
        }

        $meProfile = MeProfileResolver::resolve($deviceId);
        if (!$meProfile) {
            return ApiResponse::error('PROFILE_NOT_FOUND', 'Me profile not found', null, 404);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circle)
            ->where('me_profile_id', $meProfile->id)
            ->first();

        if (!$member || !in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only', null, 403);
        }

        [$limit, $from, $to, $actionPrefix, $cursor, $requestId] = $this->parseQuery($request);

        $query = OperationLog::query()
            ->where('circle_id', $circleModel->id);

        $this->applyFilters($query, $from, $to, $actionPrefix, $cursor, $requestId);

        $items = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit + 1)
            ->get();

        return $this->respondWithCursor($items, $limit);
    }

    private function parseQuery(Request $request): array
    {
        $limit = (int) $request->query('limit', 20);
        $limit = max(1, min($limit, 50));

        return [
            $limit,
            $request->query('from'),
            $request->query('to'),
            $request->query('actionPrefix'),
            $request->query('cursor'),
            $request->query('request_id'),
        ];
    }

    private function applyFilters($query, ?string $from, ?string $to, ?string $actionPrefix, ?string $cursor, ?string $requestId = null): void
    {
        if ($requestId) {
            $query->where('meta->request_id', $requestId);
        }

        if ($from) {
            try {
                $query->where('created_at', '>=', Carbon::parse($from));
            } catch (\Throwable) {
            }
        }

        if ($to) {
            try {
                $query->where('created_at', '<=', Carbon::parse($to));
            } catch (\Throwable) {
            }
        }

        if ($actionPrefix) {
            $query->where('action', 'like', $actionPrefix . '%');
        }

        if ($cursor) {
            $decoded = $this->decodeCursor($cursor);
            if ($decoded) {
                [$cursorAt, $cursorId] = $decoded;
                $query->where(function ($sub) use ($cursorAt, $cursorId): void {
                    $sub->where('created_at', '<', $cursorAt)
                        ->orWhere(function ($subQuery) use ($cursorAt, $cursorId): void {
                            $subQuery
                                ->where('created_at', '=', $cursorAt)
                                ->where('id', '<', $cursorId);
                        });
                });
            }
        }
    }

    private function respondWithCursor($items, int $limit)
    {
        $hasMore = $items->count() > $limit;
        $slice = $items->take($limit);
        $nextCursor = null;

        if ($hasMore && $slice->count() > 0) {
            $last = $slice->last();
            $nextCursor = $this->encodeCursor($last->created_at, (string) $last->id);
        }

        return ApiResponse::success([
            'items' => $slice->map(fn ($log) => [
                'id' => 'lg_' . (string) $log->id,
                'action' => $log->action,
                'circleId' => $log->circle_id ? (string) $log->circle_id : null,
                'actorUserId' => $log->user_id,
                'targetType' => null,
                'targetId' => null,
                'meta' => $log->meta ?? (object) [],
                'createdAt' => $log->created_at?->toIso8601String(),
            ])->values(),
            'nextCursor' => $nextCursor,
        ]);
    }

    private function encodeCursor($createdAt, string $id): string
    {
        $payload = [
            'createdAt' => $createdAt->toIso8601String(),
            'id' => $id,
        ];

        return rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    }

    private function decodeCursor(string $cursor): ?array
    {
        $raw = base64_decode(strtr($cursor, '-_', '+/'), true);
        if ($raw === false) {
            return null;
        }

        $json = json_decode($raw, true);
        if (!is_array($json) || empty($json['createdAt']) || empty($json['id'])) {
            return null;
        }

        try {
            $createdAt = Carbon::parse($json['createdAt']);
        } catch (\Throwable) {
            return null;
        }

        return [$createdAt, (string) $json['id']];
    }

    public function destroy(Request $request, string $logId)
    {
        $userId = CurrentUser::id();
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $plainId = $this->parseLogId($logId);
        if ($plainId === null) {
            return ApiResponse::error('INVALID_ID', 'Invalid log id.', null, 400);
        }

        $log = OperationLog::query()->find($plainId);
        if (!$log) {
            return ApiResponse::error('NOT_FOUND', 'Log not found.', null, 404);
        }

        if ((int) $log->user_id !== $userId) {
            return ApiResponse::error('FORBIDDEN', 'You are not allowed to delete this log.', null, 403);
        }

        $log->delete();

        return ApiResponse::success(['deleted' => true]);
    }

    public function destroyCircle(Request $request, int $circleId, string $logId)
    {
        $userId = CurrentUser::id();
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Unauthorized.', null, 401);
        }

        $circle = Circle::query()->find($circleId);
        if (!$circle) {
            return ApiResponse::error('NOT_FOUND', 'Circle not found.', null, 404);
        }

        if (!PlanGate::circleHasPlus($circle)) {
            return ApiResponse::error('FORBIDDEN', 'Plus plan required to delete circle logs.', null, 403);
        }

        $member = CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('user_id', $userId)
            ->first();

        if (!$member || !in_array($member->role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Owner/Admin only.', null, 403);
        }

        $plainId = $this->parseLogId($logId);
        if ($plainId === null) {
            return ApiResponse::error('INVALID_ID', 'Invalid log id.', null, 400);
        }

        $log = OperationLog::query()
            ->where('id', $plainId)
            ->where('circle_id', $circleId)
            ->first();

        if (!$log) {
            return ApiResponse::error('NOT_FOUND', 'Log not found.', null, 404);
        }

        $log->delete();

        return ApiResponse::success(['deleted' => true]);
    }

    private function parseLogId(string $logId): ?int
    {
        $plainId = preg_replace('/^lg_/', '', $logId);
        if (!is_numeric($plainId)) {
            return null;
        }

        return (int) $plainId;
    }
}
