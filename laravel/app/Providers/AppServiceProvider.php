<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Support\BillingCheckoutService;
use App\Support\StripeBillingCheckoutService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(BillingCheckoutService::class, StripeBillingCheckoutService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
