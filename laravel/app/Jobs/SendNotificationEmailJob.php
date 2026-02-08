<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\NotificationMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendNotificationEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly string $toEmail,
        public readonly string $title,
        public readonly string $body,
        public readonly ?string $actionUrl = null,
    ) {}

    public function handle(): void
    {
        Log::info('notification_email_sending', [
            'to' => $this->toEmail,
            'title' => $this->title,
        ]);

        Mail::to($this->toEmail)->send(
            new NotificationMail($this->title, $this->body, $this->actionUrl)
        );

        Log::info('notification_email_sent', [
            'to' => $this->toEmail,
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('notification_email_failed', [
            'to' => $this->toEmail,
            'error' => $exception->getMessage(),
        ]);
    }
}
