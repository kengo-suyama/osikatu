<?php

declare(strict_types=1);

namespace App\Support;

use Stripe\Event;

interface StripeWebhookVerifier
{
    public function constructEvent(string $payload, string $signatureHeader, string $secret): Event;
}

