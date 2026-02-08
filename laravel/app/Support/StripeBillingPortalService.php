<?php

declare(strict_types=1);

namespace App\Support;

use Stripe\StripeClient;

class StripeBillingPortalService implements BillingPortalService
{
    public function createPortalUrl(string $stripeCustomerId): string
    {
        $secret = (string) config('billing.stripe_secret_key', '');
        $returnUrl = (string) config('billing.portal_return_url', '');

        if ($secret === '' || $returnUrl === '') {
            throw new \RuntimeException('Billing config is not set.');
        }

        $client = new StripeClient($secret);
        $session = $client->billingPortal->sessions->create([
            'customer' => $stripeCustomerId,
            'return_url' => $returnUrl,
        ]);

        $url = $session?->url ?? null;
        if (!is_string($url) || $url === '') {
            throw new \RuntimeException('Stripe portal session URL missing.');
        }

        return $url;
    }
}

