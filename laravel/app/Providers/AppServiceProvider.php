<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Support\BillingCheckoutService;
use App\Support\BillingPortalService;
use App\Support\StripeBillingCheckoutService;
use App\Support\StripeBillingPortalService;
use App\Support\StripeWebhookVerifier;
use App\Support\StripeWebhookVerifierLive;
use Illuminate\Support\Facades\Log;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(BillingCheckoutService::class, StripeBillingCheckoutService::class);
        $this->app->bind(BillingPortalService::class, StripeBillingPortalService::class);
        $this->app->bind(StripeWebhookVerifier::class, StripeWebhookVerifierLive::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production')) {
            $this->validateProductionStripeConfig();
        }
    }

    private function validateProductionStripeConfig(): void
    {
        $required = [
            'STRIPE_SECRET_KEY' => config('billing.stripe_secret_key'),
            'STRIPE_WEBHOOK_SECRET' => config('services.stripe.webhook_secret'),
            'STRIPE_PRICE_PLUS' => config('billing.price_plus'),
            'BILLING_SUCCESS_URL' => config('billing.success_url'),
            'BILLING_CANCEL_URL' => config('billing.cancel_url'),
        ];

        $missing = [];
        foreach ($required as $name => $value) {
            if (!is_string($value) || trim($value) === '') {
                $missing[] = $name;
            }
        }

        if (count($missing) > 0) {
            Log::critical('stripe_config_missing_in_production', [
                'missing' => $missing,
                'count' => count($missing),
            ]);
        }

        // Block webhook signature skip in production
        $webhookSecret = config('services.stripe.webhook_secret');
        if (!is_string($webhookSecret) || trim($webhookSecret) === '') {
            Log::critical('stripe_webhook_signature_skip_blocked', [
                'reason' => 'STRIPE_WEBHOOK_SECRET must be set in production to prevent unsigned webhooks.',
            ]);
        }
    }
}
