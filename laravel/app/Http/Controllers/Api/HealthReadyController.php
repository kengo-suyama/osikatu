<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Cache;

class HealthReadyController extends Controller
{
    public function __invoke()
    {
        $errors = [];
        $warnings = [];

        $appEnv = (string) config('app.env', '');
        $isProduction = ($appEnv === 'production');

        if (!$isProduction) {
            $errors[] = [
                'code' => 'APP_ENV_NOT_PRODUCTION',
                'message' => 'APP_ENV must be production.',
            ];
        }

        $stripeSecret = (string) config('billing.stripe_secret_key', '');
        $webhookSecret = (string) config('services.stripe.webhook_secret', '');
        $pricePlus = (string) config('billing.price_plus', '');
        $successUrl = (string) config('billing.success_url', '');
        $cancelUrl = (string) config('billing.cancel_url', '');

        if ($isProduction) {
            if ($stripeSecret === '') {
                $errors[] = [
                    'code' => 'STRIPE_SECRET_KEY_MISSING',
                    'message' => 'STRIPE_SECRET_KEY is required.',
                ];
            }
            if ($webhookSecret === '') {
                $errors[] = [
                    'code' => 'STRIPE_WEBHOOK_SECRET_MISSING',
                    'message' => 'STRIPE_WEBHOOK_SECRET is required.',
                ];
            }
            if ($pricePlus === '') {
                $errors[] = [
                    'code' => 'STRIPE_PRICE_PLUS_MISSING',
                    'message' => 'STRIPE_PRICE_PLUS is required.',
                ];
            }
            if ($successUrl === '') {
                $errors[] = [
                    'code' => 'BILLING_SUCCESS_URL_MISSING',
                    'message' => 'BILLING_SUCCESS_URL is required.',
                ];
            }
            if ($cancelUrl === '') {
                $errors[] = [
                    'code' => 'BILLING_CANCEL_URL_MISSING',
                    'message' => 'BILLING_CANCEL_URL is required.',
                ];
            }

            if (!app()->configurationIsCached()) {
                $warnings[] = [
                    'code' => 'CONFIG_NOT_CACHED',
                    'message' => 'Configuration cache is not enabled (php artisan config:cache).',
                ];
            }

            $queueDefault = (string) config('queue.default', '');
            if ($queueDefault === 'sync') {
                $warnings[] = [
                    'code' => 'QUEUE_SYNC_IN_PRODUCTION',
                    'message' => 'Queue default is sync. A worker-backed queue is recommended in production.',
                ];
            }
        }

        // Queue heartbeat check (production only)
        if ($isProduction) {
            $heartbeatTs = Cache::get('queue_heartbeat_ts');
            if ($heartbeatTs === null) {
                $warnings[] = [
                    'code' => 'QUEUE_HEARTBEAT_MISSING',
                    'message' => 'Queue heartbeat not found. Ensure queue:heartbeat is scheduled.',
                ];
            } elseif ((now()->timestamp - (int) $heartbeatTs) > 120) {
                $errors[] = [
                    'code' => 'QUEUE_HEARTBEAT_STALE',
                    'message' => 'Queue heartbeat is stale (>120s). Worker may be down.',
                ];
            }
        }

        // Queue heartbeat check (production only)
        if ($isProduction) {
            $heartbeatTs = Cache::get('queue_heartbeat_ts');
            if ($heartbeatTs === null) {
                $warnings[] = [
                    'code' => 'QUEUE_HEARTBEAT_MISSING',
                    'message' => 'Queue heartbeat not found. Ensure queue:heartbeat is scheduled.',
                ];
            } elseif ((now()->timestamp - (int) $heartbeatTs) > 120) {
                $errors[] = [
                    'code' => 'QUEUE_HEARTBEAT_STALE',
                    'message' => 'Queue heartbeat is stale (>120s). Worker may be down.',
                ];
            }
        }

        return ApiResponse::success([
            'ok' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
        ]);
    }
}

