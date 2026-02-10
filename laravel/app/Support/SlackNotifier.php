<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class SlackNotifier
{
    /**
     * Send a message to Slack webhook URL.
     * No-op if SLACK_WEBHOOK_URL is not configured.
     * Rate-limited to 1 message per key per cooldown period.
     */
    public static function notify(string $text, string $rateKey = 'default', int $cooldownSeconds = 300): void
    {
        $webhookUrl = config('services.slack.webhook_url');

        if (!is_string($webhookUrl) || $webhookUrl === '') {
            return;
        }

        $cacheKey = 'slack_notify_cooldown:' . $rateKey;
        if (Cache::has($cacheKey)) {
            Log::debug('slack_notify_cooldown_active', ['rate_key' => $rateKey]);
            return;
        }

        try {
            Http::timeout(5)->post($webhookUrl, [
                'text' => $text,
            ]);

            Cache::put($cacheKey, true, $cooldownSeconds);

            Log::info('slack_notify_sent', ['rate_key' => $rateKey]);
        } catch (\Throwable $e) {
            Log::warning('slack_notify_failed', [
                'rate_key' => $rateKey,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
