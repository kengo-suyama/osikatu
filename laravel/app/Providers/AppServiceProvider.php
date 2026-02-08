<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Support\BillingCheckoutService;
use App\Support\BillingPortalService;
use App\Support\StripeBillingCheckoutService;
use App\Support\StripeBillingPortalService;
use App\Support\StripeWebhookVerifier;
use App\Support\StripeWebhookVerifierLive;

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
        //
    }
}
