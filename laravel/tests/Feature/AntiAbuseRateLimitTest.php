<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use App\Services\PointsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AntiAbuseRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_gacha_pull_rate_limited_after_10_attempts(): void
    {
        config([
            'gacha.cost' => 1,
            'gacha.pools.default' => [
                ['itemType' => 'frame', 'itemKey' => 'frame_test', 'rarity' => 'R', 'weight' => 1],
            ],
        ]);

        $user = User::factory()->create();

        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'dev-abuse-001',
            'nickname' => 'AbuseTester',
        ]);

        // Give enough points for many pulls
        PointsService::add($user->id, null, 1000, 'seed', ['source' => 'test'], null, 'seed:1000');

        // 10 pulls should succeed
        for ($i = 0; $i < 10; $i++) {
            $res = $this->withHeaders(['X-Device-Id' => 'dev-abuse-001'])
                ->postJson('/api/me/gacha/pull');
            $res->assertStatus(200);
        }

        // 11th should be rate limited
        $res = $this->withHeaders(['X-Device-Id' => 'dev-abuse-001'])
            ->postJson('/api/me/gacha/pull');
        $res->assertStatus(429);
        $res->assertJsonPath('error.code', 'RATE_LIMITED');
    }

    public function test_invite_store_throttled(): void
    {
        // This test verifies the throttle middleware is attached to the route.
        // We just need to confirm the route has a throttle middleware.
        // Making 11 requests without proper auth will trigger 401 first,
        // so we test the middleware exists differently.
        $route = app('router')->getRoutes()->getByAction('App\\Http\\Controllers\\Api\\InviteController@store');
        $this->assertNotNull($route, 'Invite store route exists');

        $middleware = $route->middleware();
        $hasThrottle = false;
        foreach ($middleware as $m) {
            if (str_starts_with($m, 'throttle:')) {
                $hasThrottle = true;
                break;
            }
        }
        $this->assertTrue($hasThrottle, 'Invite store route has throttle middleware');
    }

    public function test_auth_session_throttled(): void
    {
        $route = app('router')->getRoutes()->getByAction('App\\Http\\Controllers\\Api\\AuthController@session');
        $this->assertNotNull($route, 'Auth session route exists');

        $middleware = $route->middleware();
        $hasThrottle = false;
        foreach ($middleware as $m) {
            if (str_starts_with($m, 'throttle:')) {
                $hasThrottle = true;
                break;
            }
        }
        $this->assertTrue($hasThrottle, 'Auth session route has throttle middleware');
    }
}
