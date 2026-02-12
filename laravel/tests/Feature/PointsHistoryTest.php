<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\MeProfile;
use App\Models\User;
use App\Services\PointsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PointsHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_history_returns_paginated_transactions(): void
    {
        $user = User::factory()->create();

        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'dev-pts-hist-001',
            'nickname' => 'PtsTester',
        ]);

        PointsService::add($user->id, null, 100, 'seed', ['source' => 'test'], null, 'seed:100');
        PointsService::add($user->id, null, 5, 'share_copy', ['source' => 'test'], null, null);
        PointsService::add($user->id, null, -50, 'gacha_pull_cost', ['source' => 'gacha'], null, null);

        $response = $this->getJson('/api/me/points/history?per_page=2', [
            'X-Device-Id' => 'dev-pts-hist-001',
        ]);

        $response->assertStatus(200);
        $data = $response->json('success.data');

        $this->assertEquals(55, $data['balance']);
        $this->assertCount(2, $data['items']);
        $this->assertEquals(3, $data['total']);
        $this->assertNotNull($data['nextCursor']);

        // Newest first: gacha_pull_cost should be first
        $this->assertEquals('gacha_pull_cost', $data['items'][0]['reason']);
        $this->assertEquals(-50, $data['items'][0]['delta']);
    }

    public function test_history_empty(): void
    {
        $user = User::factory()->create();

        MeProfile::create([
            'user_id' => $user->id,
            'device_id' => 'dev-pts-hist-002',
            'nickname' => 'EmptyPts',
        ]);

        $response = $this->getJson('/api/me/points/history', [
            'X-Device-Id' => 'dev-pts-hist-002',
        ]);

        $response->assertStatus(200);
        $data = $response->json('success.data');

        $this->assertEquals(0, $data['balance']);
        $this->assertCount(0, $data['items']);
        $this->assertEquals(0, $data['total']);
        $this->assertNull($data['nextCursor']);
    }
}
