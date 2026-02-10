<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\BillingSubscription;
use App\Models\User;
use Stripe\StripeClient;

class StripeBillingCheckoutService implements BillingCheckoutService
{
    public function createCheckoutUrl(User $user, string $deviceId): string
    {
        $secret = (string) config('billing.stripe_secret_key', '');
        $pricePlus = (string) config('billing.price_plus', '');

        $baseUrl = (string) config('billing.public_url', config('app.url', ''));
        $successUrl = $this->resolveUrl($baseUrl, (string) config('billing.success_url', ''));
        $cancelUrl = $this->resolveUrl($baseUrl, (string) config('billing.cancel_url', ''));

        if ($secret === '' || $pricePlus === '' || $successUrl === '' || $cancelUrl === '') {
            throw new \RuntimeException('Billing config is not set.');
        }

        $client = new StripeClient($secret);

        $sub = BillingSubscription::query()
            ->where('user_id', $user->id)
            ->where('plan', 'plus')
            ->first();

        $params = [
            'mode' => 'subscription',
            'line_items' => [
                ['price' => $pricePlus, 'quantity' => 1],
            ],
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'metadata' => [
                'user_id' => (string) $user->id,
                'device_id' => $deviceId,
            ],
            'subscription_data' => [
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'device_id' => $deviceId,
                ],
            ],
            'client_reference_id' => (string) $user->id,
        ];

        if ($sub?->stripe_customer_id) {
            $params['customer'] = $sub->stripe_customer_id;
        } else {
            $params['customer_email'] = $user->email;
        }

        $session = $client->checkout->sessions->create($params);

        $url = $session?->url ?? null;
        if (!is_string($url) || $url === '') {
            throw new \RuntimeException('Stripe checkout session URL missing.');
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
