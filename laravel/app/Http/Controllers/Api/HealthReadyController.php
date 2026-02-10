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

        // Mail config check (production only)
        if ($isProduction) {
            $mailMailer = (string) config('mail.default', '');
            $mailFrom = (string) config('mail.from.address', '');
            $mailHost = (string) config('mail.mailers.smtp.host', '');

            if ($mailMailer === 'log' || $mailMailer === 'array') {
                $warnings[] = [
                    'code' => 'MAIL_MAILER_NOT_PRODUCTION',
                    'message' => "MAIL_MAILER is '{$mailMailer}'. SMTP recommended for production.",
                ];
            }

            if ($mailFrom === '' || $mailFrom === 'hello@example.com') {
                $errors[] = [
                    'code' => 'MAIL_FROM_ADDRESS_MISSING',
                    'message' => 'MAIL_FROM_ADDRESS must be set for production email delivery.',
                ];
            }

            if ($mailMailer === 'smtp' && $mailHost === '') {
                $errors[] = [
                    'code' => 'MAIL_HOST_MISSING',
                    'message' => 'MAIL_HOST is required when using SMTP mailer.',
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

