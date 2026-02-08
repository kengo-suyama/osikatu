<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_invite_join_rate_limited(): void
    {
        // Send 11 requests to exceed the 10/min limit
        for ($i = 0; $i < 11; $i++) {
            $response = $this->postJson('/api/invites/join', ['code' => 'invalid-code-' . $i]);
        }

        // The 11th request should be rate limited
        $response->assertStatus(429);
    }

    public function test_auth_link_start_rate_limited(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $response = $this->withHeaders([
                'X-Device-Id' => 'device-rate-test-' . $i,
            ])->postJson('/api/auth/link/start');
        }

        $response->assertStatus(429);
    }
}
