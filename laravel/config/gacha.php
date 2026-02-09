<?php

declare(strict_types=1);

return [
    'cost' => 100,

    // Weight-based prize pools. Keep this config-only for MVP so it works with config cache.
    'pools' => [
        'default' => [
            ['itemType' => 'frame', 'itemKey' => 'frame_torii', 'rarity' => 'R', 'weight' => 55],
            ['itemType' => 'frame', 'itemKey' => 'frame_shimenawa', 'rarity' => 'R', 'weight' => 25],
            ['itemType' => 'theme', 'itemKey' => 'theme_washi', 'rarity' => 'SR', 'weight' => 12],
            ['itemType' => 'title', 'itemKey' => 'title_apprentice_onmyoji', 'rarity' => 'SSR', 'weight' => 7],
            ['itemType' => 'frame', 'itemKey' => 'frame_seiman_star', 'rarity' => 'UR', 'weight' => 1],
        ],
    ],
];

