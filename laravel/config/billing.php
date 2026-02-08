<?php

return [
    'stripe_secret_key' => env('STRIPE_SECRET_KEY'),
    'price_plus' => env('STRIPE_PRICE_PLUS'),
    'success_url' => env('BILLING_SUCCESS_URL'),
    'cancel_url' => env('BILLING_CANCEL_URL'),
    'portal_return_url' => env('BILLING_PORTAL_RETURN_URL'),
];

