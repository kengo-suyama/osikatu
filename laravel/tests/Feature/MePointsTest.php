<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Circle;
use App\Models\MeProfile;
use App\Models\PointsTransaction;
use App\Models\User;
use App\Services\PointsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MePointsTest extends TestCase
{
    use RefreshDatabase;

    private function createProfile(string $deviceId): MeProfile
    {
        $user = User::factory()->create();
        return MeProfile::create([
            'user_id' => $user->id,
            'device_id' => $deviceId,
            'nickname' => 'Points',
            'initial' => 'P',
        ]);
    }

    public function test_points_endpoint_returns_balance_and_recent_history(): void
    {
        $profile = $this->createProfile('device-points-001');
        $circle = Circle::factory()->create();

        // Personal points
        PointsService::add(
            $profile->user_id,
            null,
            50,
            'share_copy',
            ['source' => 'test'],
            'req_points_001',
            'idem-personal-001'
        );

        // Circle points (should not affect /api/me/points personal balance)
        PointsService::add(
            $profile->user_id,
            $circle->id,
            10,
            'circle_bonus',
            ['source' => 'test'],
            'req_points_002',
            'idem-circle-001'
        );

        $res = $this->withHeaders([
            'X-Device-Id' => $profile->device_id,
            'X-Request-Id' => 'req_test_header_001',
        ])->getJson('/api/me/points');

        $res->assertStatus(200)
            ->assertJsonPath('success.data.balance', 50)
            ->assertJsonPath('success.data.items.0.delta', 50)
            ->assertJsonPath('success.data.items.0.reason', 'share_copy')
            ->assertJsonPath('success.data.items.0.requestId', 'req_points_001');

        $this->assertDatabaseHas('points_transactions', [
            'user_id' => $profile->user_id,
            'circle_id' => null,
            'delta' => 50,
            'reason' => 'share_copy',
            'request_id' => 'req_points_001',
            'idempotency_key' => 'idem-personal-001',
        ]);

        $this->assertDatabaseHas('points_transactions', [
            'user_id' => $profile->user_id,
            'circle_id' => $circle->id,
            'delta' => 10,
            'reason' => 'circle_bonus',
            'request_id' => 'req_points_002',
            'idempotency_key' => 'idem-circle-001',
        ]);
    }

    public function test_points_service_is_idempotent_when_key_is_provided(): void
    {
        $profile = $this->createProfile('device-points-002');

        PointsService::add(
            $profile->user_id,
            null,
            5,
            'test',
            null,
            'req_points_idem_001',
            'idem-dup-001'
        );

        PointsService::add(
            $profile->user_id,
            null,
            5,
            'test',
            null,
            'req_points_idem_002',
            'idem-dup-001'
        );

        $this->assertSame(
            1,
            PointsTransaction::query()
                ->where('user_id', $profile->user_id)
                ->whereNull('circle_id')
                ->where('idempotency_key', 'idem-dup-001')
                ->count()
        );
    }
}

