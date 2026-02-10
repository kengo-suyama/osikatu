<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Lightweight smoke tests covering gacha, chat, and i18n related endpoints.
 * These run in CI to catch regressions quickly.
 */
class CiSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_gacha_pull_endpoint_exists(): void
    {
        $user = User::factory()->create();
        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'dev-smoke-001',
            'nickname' => 'Smoke',
        ]);

        // Without points it should return 409 (not 404/500)
        $res = $this->withHeaders(['X-Device-Id' => 'dev-smoke-001'])
            ->postJson('/api/me/gacha/pull');

        $this->assertContains($res->status(), [200, 409]);
    }

    public function test_healthz_endpoint(): void
    {
        $res = $this->getJson('/api/healthz');
        $res->assertStatus(200);
    }

    public function test_me_points_endpoint(): void
    {
        $user = User::factory()->create();
        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'dev-smoke-002',
            'nickname' => 'Smoke2',
        ]);

        $res = $this->withHeaders(['X-Device-Id' => 'dev-smoke-002'])
            ->getJson('/api/me/points');
        $res->assertStatus(200);
        $this->assertArrayHasKey('balance', $res->json('success.data'));
    }

    public function test_inventory_endpoint(): void
    {
        $user = User::factory()->create();
        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'dev-smoke-003',
            'nickname' => 'Smoke3',
        ]);

        $res = $this->withHeaders(['X-Device-Id' => 'dev-smoke-003'])
            ->getJson('/api/me/inventory');
        $res->assertStatus(200);
    }
}
