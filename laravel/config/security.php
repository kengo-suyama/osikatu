<?php

return [
    'rate_limits' => [
        'auth_link_start' => [
            'max_attempts' => (int) env('RATE_LIMIT_AUTH_LINK', 5),
            'decay_minutes' => 1,
        ],
        'invite_join' => [
            'max_attempts' => (int) env('RATE_LIMIT_INVITE_JOIN', 10),
            'decay_minutes' => 1,
        ],
        'stripe_webhook' => [
            'max_attempts' => (int) env('RATE_LIMIT_STRIPE_WEBHOOK', 30),
            'decay_minutes' => 1,
        ],
        'api_default' => [
            'max_attempts' => (int) env('RATE_LIMIT_API_DEFAULT', 60),
            'decay_minutes' => 1,
        ],
    ],
];
