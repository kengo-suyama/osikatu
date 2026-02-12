<?php

declare(strict_types=1);

namespace App\Services;

final class GachaService
{
    /**
     * @return array{itemType: string, itemKey: string, rarity: string}
     */
    public static function draw(string $pool = 'default'): array
    {
        /** @var array<int, array<string, mixed>> $items */
        if (str_starts_with($pool, 'circle:')) {
            $subPool = substr($pool, 7);
            $items = config("gacha.circle_pools.{$subPool}", []);
        } else {
            $items = config("gacha.pools.{$pool}", []);
        }
        if (!is_array($items) || count($items) === 0) {
            throw new \RuntimeException("Gacha pool not configured: {$pool}");
        }

        $total = 0;
        foreach ($items as $item) {
            $w = (int) ($item['weight'] ?? 0);
            if ($w > 0) {
                $total += $w;
            }
        }
        if ($total <= 0) {
            throw new \RuntimeException("Gacha pool has no positive weight: {$pool}");
        }

        $roll = random_int(1, $total);
        $acc = 0;
        foreach ($items as $item) {
            $w = (int) ($item['weight'] ?? 0);
            if ($w <= 0) {
                continue;
            }
            $acc += $w;
            if ($roll <= $acc) {
                $itemType = (string) ($item['itemType'] ?? '');
                $itemKey = (string) ($item['itemKey'] ?? '');
                $rarity = (string) ($item['rarity'] ?? 'N');
                if (trim($itemType) === '' || trim($itemKey) === '') {
                    throw new \RuntimeException("Invalid gacha item in pool: {$pool}");
                }
                return [
                    'itemType' => $itemType,
                    'itemKey' => $itemKey,
                    'rarity' => $rarity,
                ];
            }
        }

        // Should be unreachable due to roll range/accumulation.
        throw new \RuntimeException("Gacha draw failed: {$pool}");
    }
}

