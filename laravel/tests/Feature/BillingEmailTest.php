<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Mail\BillingUpgradeMail;
use App\Mail\BillingPaymentFailedMail;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BillingEmailTest extends TestCase
{
    public function test_upgrade_mail_renders(): void
    {
        $mail = new BillingUpgradeMail('Test User', 'plus');
        $rendered = $mail->render();

        $this->assertStringContainsString('Test User', $rendered);
    }

    public function test_payment_failed_mail_renders(): void
    {
        $mail = new BillingPaymentFailedMail('Test User', 'https://example.com/portal');
        $rendered = $mail->render();

        $this->assertStringContainsString('Test User', $rendered);
        $this->assertStringContainsString('https://example.com/portal', $rendered);
    }

    public function test_upgrade_mail_can_be_queued(): void
    {
        Mail::fake();

        Mail::to('user@example.com')->queue(new BillingUpgradeMail('Test', 'plus'));

        Mail::assertQueued(BillingUpgradeMail::class);
    }
}
