<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\EmailSuppression;
use Illuminate\Support\Facades\Log;

class MailSuppressionCheck
{
    public static function shouldSkip(string $email): bool
    {
        if (EmailSuppression::isSuppressed($email)) {
            Log::info('email_send_suppressed', ['email' => $email]);
            return true;
        }
        return false;
    }
}
