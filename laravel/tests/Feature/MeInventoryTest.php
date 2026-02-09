<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\Oshi;
use App\Models\User;
use App\Models\UserUnlock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeInventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_inventory_lists_unlocks_and_apply_theme(): void
    {
        $user = User::factory()->create(['ui_theme_id' => 'light']);
        MeProfile::create([
            'device_id' => 'dev-inv-001',
            'nickname' => 'Inv',
            'initial' => 'I',
            'user_id' => $user->id,
        ]);

        UserUnlock::create([
            'user_id' => $user->id,
            'item_type' => 'theme',
            'item_key' => 'midnight',
            'rarity' => 'SR',
            'source' => 'gacha',
            'acquired_at' => now(),
        ]);

        $list = $this->withHeaders(['X-Device-Id' => 'dev-inv-001'])
            ->getJson('/api/me/inventory');

        $list->assertStatus(200)
            ->assertJsonPath('success.data.items.0.itemType', 'theme')
            ->assertJsonPath('success.data.items.0.itemKey', 'midnight');

        $apply = $this->withHeaders([
            'X-Device-Id' => 'dev-inv-001',
            'Content-Type' => 'application/json',
        ])->postJson('/api/me/inventory/apply', [
            'itemType' => 'theme',
            'itemKey' => 'midnight',
        ]);

        $apply->assertStatus(200)
            ->assertJsonPath('success.data.applied.themeId', 'midnight');
        $this->assertSame('midnight', (string) $user->fresh()->ui_theme_id);
    }

    public function test_apply_frame_requires_primary_oshi_and_ownership(): void
    {
        $user = User::factory()->create();
        MeProfile::create([
            'device_id' => 'dev-inv-002',
            'nickname' => 'Inv',
            'initial' => 'I',
            'user_id' => $user->id,
        ]);

        UserUnlock::create([
            'user_id' => $user->id,
            'item_type' => 'frame',
            'item_key' => 'sparkle',
            'rarity' => 'UR',
            'source' => 'gacha',
            'acquired_at' => now(),
        ]);

        $noOshi = $this->withHeaders([
            'X-Device-Id' => 'dev-inv-002',
            'Content-Type' => 'application/json',
        ])->postJson('/api/me/inventory/apply', [
            'itemType' => 'frame',
            'itemKey' => 'sparkle',
        ]);

        $noOshi->assertStatus(409)->assertJsonPath('error.code', 'OSHI_REQUIRED');

        $oshi = Oshi::create([
            'user_id' => $user->id,
            'name' => 'Primary',
            'is_primary' => true,
            'category' => null,
            'color' => null,
            'image_path' => null,
            'image_frame_id' => null,
            'memo' => null,
        ]);

        $ok = $this->withHeaders([
            'X-Device-Id' => 'dev-inv-002',
            'Content-Type' => 'application/json',
        ])->postJson('/api/me/inventory/apply', [
            'itemType' => 'frame',
            'itemKey' => 'sparkle',
        ]);

        $ok->assertStatus(200)
            ->assertJsonPath('success.data.applied.oshiId', $oshi->id)
            ->assertJsonPath('success.data.applied.imageFrameId', 'sparkle');
        $this->assertSame('sparkle', (string) $oshi->fresh()->image_frame_id);

        $notOwned = $this->withHeaders([
            'X-Device-Id' => 'dev-inv-002',
            'Content-Type' => 'application/json',
        ])->postJson('/api/me/inventory/apply', [
            'itemType' => 'theme',
            'itemKey' => 'neon',
        ]);

        $notOwned->assertStatus(404)->assertJsonPath('error.code', 'INVENTORY_NOT_OWNED');
    }
}

