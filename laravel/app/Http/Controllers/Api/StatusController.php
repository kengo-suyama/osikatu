<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\DB;

class StatusController extends Controller
{
    public function __invoke()
    {
        $checks = [];

        // DB
        $dbOk = false;
        try {
            DB::select('SELECT 1');
            $dbOk = true;
        } catch (\Throwable) {}
        $checks['database'] = $dbOk ? 'ok' : 'error';

        // Queue
        $queueDriver = (string) config('queue.default', 'sync');
        $checks['queue'] = $queueDriver !== 'sync' ? 'ok' : 'degraded';
        $checks['queue_driver'] = $queueDriver;

        // Cache
        $cacheOk = false;
        try {
            cache()->put('_status_check', 1, 5);
            $cacheOk = cache()->get('_status_check') === 1;
            cache()->forget('_status_check');
        } catch (\Throwable) {}
        $checks['cache'] = $cacheOk ? 'ok' : 'degraded';

        // Config cache
        $checks['config_cached'] = app()->configurationIsCached() ? 'yes' : 'no';

        // Stripe (safe subset)
        $stripeOk = (string) config('billing.stripe_secret_key', '') !== '';
        $checks['stripe'] = $stripeOk ? 'configured' : 'not_configured';

        // Overall
        $overall = $dbOk ? 'operational' : 'degraded';
        if (!$dbOk) {
            $overall = 'major_outage';
        }

        return ApiResponse::success([
            'status' => $overall,
            'checks' => $checks,
            'timestamp' => now()->toIso8601String(),
            'version' => config('app.version', 'unknown'),
        ]);
    }
}
