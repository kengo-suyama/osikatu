<?php

declare(strict_types=1);

return [
    'cost' => 100,

    // Weight-based prize pools. Keep this config-only for MVP so it works with config cache.
    'pools' => [
        'default' => [
            // Keep IDs aligned with frontend-known ThemeId / FrameId to reflect immediately.
            ['itemType' => 'frame', 'itemKey' => 'polaroid_elegant', 'rarity' => 'R', 'weight' => 55],
            ['itemType' => 'frame', 'itemKey' => 'polaroid_pop', 'rarity' => 'R', 'weight' => 25],
            ['itemType' => 'theme', 'itemKey' => 'midnight', 'rarity' => 'SR', 'weight' => 12],
            ['itemType' => 'theme', 'itemKey' => 'neon', 'rarity' => 'SSR', 'weight' => 7],
            ['itemType' => 'frame', 'itemKey' => 'festival_holo', 'rarity' => 'UR', 'weight' => 1],
        ],
    ],
];
