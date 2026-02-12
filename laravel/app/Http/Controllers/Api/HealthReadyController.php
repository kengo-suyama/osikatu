<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;

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
            $stripeChecks = [
                ['STRIPE_SECRET_KEY_MISSING', 'STRIPE_SECRET_KEY is required.', $stripeSecret],
                ['STRIPE_WEBHOOK_SECRET_MISSING', 'STRIPE_WEBHOOK_SECRET is required. Signature skip is forbidden in production.', $webhookSecret],
                ['STRIPE_PRICE_PLUS_MISSING', 'STRIPE_PRICE_PLUS is required.', $pricePlus],
                ['BILLING_SUCCESS_URL_MISSING', 'BILLING_SUCCESS_URL is required.', $successUrl],
                ['BILLING_CANCEL_URL_MISSING', 'BILLING_CANCEL_URL is required.', $cancelUrl],
            ];

            foreach ($stripeChecks as [$code, $message, $value]) {
                if ($value === '') {
                    $errors[] = ['code' => $code, 'message' => $message];
                }
            }

            if ($stripeSecret !== '' && !str_starts_with($stripeSecret, 'sk_')) {
                $warnings[] = [
                    'code' => 'STRIPE_SECRET_KEY_FORMAT',
                    'message' => 'STRIPE_SECRET_KEY does not start with sk_. Verify it is a valid Stripe secret key.',
                ];
            }

            if ($webhookSecret !== '' && !str_starts_with($webhookSecret, 'whsec_')) {
                $warnings[] = [
                    'code' => 'STRIPE_WEBHOOK_SECRET_FORMAT',
                    'message' => 'STRIPE_WEBHOOK_SECRET does not start with whsec_. Verify it is valid.',
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

        $ok = count($errors) === 0;

        return ApiResponse::success([
            'ok' => $ok,
            'errors' => $errors,
            'warnings' => $warnings,
        ], null, $ok ? 200 : 503);
    }
}
