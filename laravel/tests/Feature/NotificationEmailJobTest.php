<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\SendNotificationEmailJob;
use App\Mail\NotificationMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NotificationEmailJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_dispatches_and_sends_mail(): void
    {
        Mail::fake();

        $job = new SendNotificationEmailJob(
            'test@example.com',
            'Test Title',
            'Test body content',
            'https://osikatu.com/notifications',
        );

        $job->handle();

        Mail::assertSent(NotificationMail::class, function ($mail) {
            return $mail->hasTo('test@example.com')
                && $mail->notificationTitle === 'Test Title';
        });
    }

    public function test_job_can_be_queued(): void
    {
        Queue::fake();

        SendNotificationEmailJob::dispatch(
            'test@example.com',
            'Queued Title',
            'Queued body',
        );

        Queue::assertPushed(SendNotificationEmailJob::class);
    }
}
