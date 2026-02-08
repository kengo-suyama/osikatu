<?php

declare(strict_types=1);

namespace App\Support;

interface BillingPortalService
{
    public function createPortalUrl(string $stripeCustomerId): string;
}

