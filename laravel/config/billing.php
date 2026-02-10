<?php

return [
    'stripe_secret_key' => env('STRIPE_SECRET_KEY'),
    'price_plus' => env('STRIPE_PRICE_PLUS'),

    // All billing URLs are built from APP_PUBLIC_URL (falls back to APP_URL).
    // Set paths in BILLING_*_PATH or override with full URL in BILLING_*_URL.
    'public_url' => env('APP_PUBLIC_URL', env('APP_URL', 'http://localhost')),

    'success_url' => env('BILLING_SUCCESS_URL', ''),
    'cancel_url' => env('BILLING_CANCEL_URL', ''),
    'portal_return_url' => env('BILLING_PORTAL_RETURN_URL', ''),

    'debug_enabled' => env('BILLING_DEBUG_ENABLED', false),
];
