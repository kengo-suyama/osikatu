<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailConfigTest extends TestCase
{
    public function test_mail_config_has_required_keys(): void
    {
        $this->assertNotNull(config('mail.default'));
        $this->assertNotNull(config('mail.from.address'));
        $this->assertNotNull(config('mail.from.name'));
    }

    public function test_smtp_config_structure(): void
    {
        $smtp = config('mail.mailers.smtp');
        $this->assertIsArray($smtp);
        $this->assertArrayHasKey('host', $smtp);
        $this->assertArrayHasKey('port', $smtp);
        $this->assertArrayHasKey('encryption', $smtp);
    }

    public function test_send_test_email_via_log_driver(): void
    {
        Mail::fake();

        Mail::raw('test', function ($message) {
            $message->to('test@example.com')->subject('Test');
        });

        Mail::assertSent(fn () => true);
    }
}
