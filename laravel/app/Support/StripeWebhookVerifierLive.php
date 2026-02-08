<?php

declare(strict_types=1);

namespace App\Support;

use Stripe\Event;
use Stripe\Webhook;

class StripeWebhookVerifierLive implements StripeWebhookVerifier
{
    public function constructEvent(string $payload, string $signatureHeader, string $secret): Event
    {
        return Webhook::constructEvent($payload, $signatureHeader, $secret);
    }
}

