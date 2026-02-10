<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Listeners\ApplyEmailSuppression;
use App\Models\EmailSuppression;
use App\Support\MailSuppressionCheck;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailSuppressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_bounce_event_creates_suppression(): void
    {
        ApplyEmailSuppression::fromSendGridEvent([
            'event' => 'bounce',
            'email' => 'bad@example.com',
        ]);

        $this->assertTrue(EmailSuppression::isSuppressed('bad@example.com'));
    }

    public function test_spamreport_event_creates_suppression(): void
    {
        ApplyEmailSuppression::fromSendGridEvent([
            'event' => 'spamreport',
            'email' => 'spam@example.com',
        ]);

        $this->assertTrue(EmailSuppression::isSuppressed('spam@example.com'));
    }

    public function test_delivered_event_does_not_suppress(): void
    {
        ApplyEmailSuppression::fromSendGridEvent([
            'event' => 'delivered',
            'email' => 'good@example.com',
        ]);

        $this->assertFalse(EmailSuppression::isSuppressed('good@example.com'));
    }

    public function test_suppressed_address_should_skip(): void
    {
        EmailSuppression::suppress('blocked@example.com', 'bounce');

        $this->assertTrue(MailSuppressionCheck::shouldSkip('blocked@example.com'));
    }

    public function test_non_suppressed_address_should_not_skip(): void
    {
        $this->assertFalse(MailSuppressionCheck::shouldSkip('ok@example.com'));
    }

    public function test_duplicate_suppression_updates_not_duplicates(): void
    {
        EmailSuppression::suppress('dup@example.com', 'bounce');
        EmailSuppression::suppress('dup@example.com', 'spamreport');

        $this->assertDatabaseCount('email_suppressions', 1);
        $this->assertDatabaseHas('email_suppressions', [
            'email' => 'dup@example.com',
            'reason' => 'spamreport',
        ]);
    }
}
