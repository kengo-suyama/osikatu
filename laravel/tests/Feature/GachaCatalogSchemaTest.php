<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\GachaItem;
use App\Models\GachaPool;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GachaCatalogSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_gacha_items_table_exists(): void
    {
        $item = GachaItem::create([
            'item_type' => 'frame',
            'item_key' => 'test_frame',
            'name' => 'Test Frame',
            'rarity' => 'R',
        ]);

        $this->assertDatabaseHas('gacha_items', [
            'id' => $item->id,
            'item_type' => 'frame',
            'item_key' => 'test_frame',
            'rarity' => 'R',
        ]);
    }

    public function test_gacha_pools_table_exists(): void
    {
        $pool = GachaPool::create([
            'slug' => 'default',
            'name' => 'Default Pool',
            'cost' => 100,
        ]);

        $this->assertDatabaseHas('gacha_pools', [
            'id' => $pool->id,
            'slug' => 'default',
            'cost' => 100,
        ]);
    }

    public function test_pool_items_pivot_works(): void
    {
        $pool = GachaPool::create([
            'slug' => 'test-pool',
            'name' => 'Test Pool',
            'cost' => 100,
        ]);

        $item = GachaItem::create([
            'item_type' => 'theme',
            'item_key' => 'midnight',
            'name' => 'Midnight Theme',
            'rarity' => 'SR',
        ]);

        $pool->items()->attach($item->id, ['weight' => 12]);

        $this->assertDatabaseHas('gacha_pool_items', [
            'pool_id' => $pool->id,
            'item_id' => $item->id,
            'weight' => 12,
        ]);

        $this->assertCount(1, $pool->fresh()->items);
        $this->assertEquals(12, $pool->fresh()->items->first()->pivot->weight);
    }

    public function test_item_type_key_unique_constraint(): void
    {
        GachaItem::create([
            'item_type' => 'frame',
            'item_key' => 'unique_frame',
            'name' => 'First',
            'rarity' => 'R',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        GachaItem::create([
            'item_type' => 'frame',
            'item_key' => 'unique_frame',
            'name' => 'Duplicate',
            'rarity' => 'SR',
        ]);
    }
}
