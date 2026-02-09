<?php

declare(strict_types=1);

namespace App\Support;

use Stripe\StripeClient;

class StripeBillingPortalService implements BillingPortalService
{
    public function createPortalUrl(string $stripeCustomerId): string
    {
        $secret = (string) config('billing.stripe_secret_key', '');
        $rawReturnUrl = (string) config('billing.portal_return_url', '');

        $baseUrl = (string) config('billing.public_url', config('app.url', ''));
        $returnUrl = $this->resolveUrl($baseUrl, $rawReturnUrl);

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

    private function resolveUrl(string $baseUrl, string $value): string
    {
        $v = trim($value);
        if ($v === '') {
            return '';
        }
        if (preg_match('/^https?:\\/\\//i', $v) === 1) {
            return $v;
        }
        $base = trim($baseUrl);
        if ($base === '') {
            return $v;
        }

        if (str_starts_with($v, '/')) {
            return rtrim($base, '/') . $v;
        }
        return rtrim($base, '/') . '/' . ltrim($v, '/');
    }
}
