<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Models\EmailSuppression;
use Illuminate\Support\Facades\Log;

class ApplyEmailSuppression
{
    private const SUPPRESSION_EVENTS = ['bounce', 'dropped', 'spamreport'];

    public static function fromSendGridEvent(array $event): void
    {
        $eventType = (string) ($event['event'] ?? '');
        $email = (string) ($event['email'] ?? '');

        if ($email === '' || !in_array($eventType, self::SUPPRESSION_EVENTS, true)) {
            return;
        }

        EmailSuppression::suppress($email, $eventType);

        Log::info('email_suppression_applied', [
            'email' => $email,
            'reason' => $eventType,
        ]);
    }
}
