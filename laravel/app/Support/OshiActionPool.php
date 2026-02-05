<?php

declare(strict_types=1);

namespace App\Support;

class OshiActionPool
{
    private static ?array $cached = null;

    public static function all(): array
    {
        if (self::$cached !== null) {
            return self::$cached;
        }

        $path = base_path('resources/oshi_actions_pool.json');
        if (!file_exists($path)) {
            self::$cached = [];
            return self::$cached;
        }

        $raw = file_get_contents($path);
        if ($raw === false) {
            self::$cached = [];
            return self::$cached;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            self::$cached = [];
            return self::$cached;
        }

        $items = [];
        foreach ($decoded as $item) {
            if (!is_string($item)) {
                continue;
            }
            $value = trim($item);
            if ($value === '') {
                continue;
            }
            $items[] = $value;
        }

        self::$cached = array_values(array_unique($items));
        return self::$cached;
    }
}
