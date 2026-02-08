<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\BillingSubscription;
use App\Models\User;
use Stripe\StripeClient;

class StripeBillingCheckoutService implements BillingCheckoutService
{
    public function createCheckoutUrl(User $user): string
    {
        $secret = (string) config('billing.stripe_secret_key', '');
        $pricePlus = (string) config('billing.price_plus', '');
        $successUrl = (string) config('billing.success_url', '');
        $cancelUrl = (string) config('billing.cancel_url', '');

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
            'subscription_data' => [
                'metadata' => [
                    'user_id' => (string) $user->id,
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
}

