<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HealthController extends Controller
{
    public function __invoke()
    {
        $dbOk = false;
        try {
            DB::select('SELECT 1');
            $dbOk = true;
        } catch (\Throwable $e) {
            Log::error('healthz_db_fail', ['error' => $e->getMessage()]);
        }

        $data = [
            'status' => $dbOk ? 'ok' : 'degraded',
            'db_ok' => $dbOk,
            'time' => now()->toIso8601String(),
            'app_version' => config('app.version', 'unknown'),
            'request_id' => request()->header('X-Request-Id', null),
        ];

        $status = $dbOk ? 200 : 500;

        return ApiResponse::success($data, null, $status);
    }
}
