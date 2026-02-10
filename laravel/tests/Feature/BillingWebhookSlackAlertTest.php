<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\SlackNotifier;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BillingWebhookSlackAlertTest extends TestCase
{
    public function test_notifier_sends_when_webhook_url_configured(): void
    {
        config(['services.slack.webhook_url' => 'https://hooks.slack.com/test']);
        Http::fake(['*' => Http::response('ok', 200)]);
        Cache::flush();

        SlackNotifier::notify('test message', 'test_key', 60);

        Http::assertSentCount(1);
    }

    public function test_notifier_noop_when_webhook_url_missing(): void
    {
        config(['services.slack.webhook_url' => null]);
        Http::fake();

        SlackNotifier::notify('test message');

        Http::assertNothingSent();
    }

    public function test_notifier_respects_cooldown(): void
    {
        config(['services.slack.webhook_url' => 'https://hooks.slack.com/test']);
        Http::fake(['*' => Http::response('ok', 200)]);
        Cache::flush();

        SlackNotifier::notify('first', 'cooldown_test', 300);
        SlackNotifier::notify('second', 'cooldown_test', 300);

        Http::assertSentCount(1);
    }

    public function test_notifier_does_not_crash_on_http_failure(): void
    {
        config(['services.slack.webhook_url' => 'https://hooks.slack.com/test']);
        Http::fake(['*' => Http::response('error', 500)]);
        Cache::flush();

        SlackNotifier::notify('test message', 'error_test', 60);

        $this->assertTrue(true); // Did not throw
    }
}
