<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendTestEmail extends Command
{
    protected $signature = 'email:test {to : Recipient email address}';
    protected $description = 'Send a test email to verify SMTP configuration';

    public function handle(): int
    {
        $to = $this->argument('to');

        $this->info("Sending test email to {$to}...");
        $this->info("Mailer: " . config('mail.default'));
        $this->info("Host: " . config('mail.mailers.smtp.host'));
        $this->info("From: " . config('mail.from.address'));

        try {
            Mail::raw('This is a test email from Osikatu. If you see this, email is working.', function ($message) use ($to) {
                $message->to($to)
                    ->subject('[Osikatu] Test Email - ' . now()->toIso8601String());
            });

            $this->info('Test email sent successfully.');
            Log::info('test_email_sent', ['to' => $to, 'mailer' => config('mail.default')]);
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Failed to send test email: ' . $e->getMessage());
            Log::error('test_email_failed', [
                'to' => $to,
                'error' => $e->getMessage(),
                'mailer' => config('mail.default'),
            ]);
            return self::FAILURE;
        }
    }
}
