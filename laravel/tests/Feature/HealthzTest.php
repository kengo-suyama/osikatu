<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HealthzTest extends TestCase
{
    use RefreshDatabase;

    public function test_healthz_returns_ok(): void
    {
        $response = $this->getJson('/api/healthz');

        $response->assertStatus(200);
        $data = $response->json('success.data');
        $this->assertEquals('ok', $data['status']);
        $this->assertTrue($data['db_ok']);
        $this->assertArrayHasKey('time', $data);
        $this->assertArrayHasKey('app_version', $data);
    }

    public function test_healthz_returns_500_when_db_fails(): void
    {
        // Mock DB::select to simulate connection failure without breaking the connection
        DB::shouldReceive('select')
            ->once()
            ->with('SELECT 1')
            ->andThrow(new \PDOException('Connection refused'));

        $response = $this->getJson('/api/healthz');

        $response->assertStatus(500);
        $data = $response->json('success.data');
        $this->assertEquals('degraded', $data['status']);
        $this->assertFalse($data['db_ok']);
    }
}
