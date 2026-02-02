<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventLog;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;

class EventController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'eventName' => ['required', 'string', 'max:50', 'regex:/^[a-z0-9_]+$/'],
            'screen' => ['required', 'string', 'max:255', 'regex:/^\/[A-Za-z0-9_\-\/]*$/'],
            'circleId' => ['nullable', 'integer', 'exists:circles,id'],
            'meta' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();

        $meta = $data['meta'] ?? null;
        if ($meta !== null) {
            $encoded = json_encode($meta, JSON_UNESCAPED_UNICODE);
            if ($encoded === false || strlen($encoded) > 1024) {
                return ApiResponse::error('VALIDATION_ERROR', 'Meta is too large.', [
                    'meta' => ['Meta must be within 1KB.'],
                ], 422);
            }
        }

        $deviceId = $request->header('X-Device-Id');
        $meProfile = $deviceId ? MeProfileResolver::resolve($deviceId) : null;

        $rateKey = $deviceId
            ? 'events:' . $deviceId
            : 'events:user:' . CurrentUser::id();

        if (RateLimiter::tooManyAttempts($rateKey, 60)) {
            return ApiResponse::error('RATE_LIMITED', 'Too many requests.', null, 429);
        }
        RateLimiter::hit($rateKey, 60);

        EventLog::create([
            'me_profile_id' => $meProfile?->id,
            'circle_id' => $data['circleId'] ?? null,
            'event_name' => $data['eventName'],
            'screen' => $data['screen'],
            'meta' => $meta,
        ]);

        return ApiResponse::success(null);
    }
}
