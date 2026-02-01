<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\OperationLog;
use Illuminate\Http\Request;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use App\Support\OperationLogMetaPolicy;

class OperationLogService
{
    public static function log(Request $request, string $action, ?int $circleId = null, array $meta = []): void
    {
        $meta = OperationLogMetaPolicy::sanitize($action, $meta);
        if (!empty($meta)) {
            $encoded = json_encode($meta, JSON_UNESCAPED_UNICODE);
            if ($encoded === false || strlen($encoded) > 1024) {
                $meta = [];
            }
        }

        $deviceId = $request->header('X-Device-Id');
        $profile = $deviceId ? MeProfileResolver::resolve($deviceId) : null;

        OperationLog::create([
            'user_id' => CurrentUser::id(),
            'me_profile_id' => $profile?->id,
            'circle_id' => $circleId,
            'action' => $action,
            'meta' => !empty($meta) ? $meta : null,
        ]);
    }
}
