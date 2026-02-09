<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RequestMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_response_has_timing_header(): void
    {
        $response = $this->getJson('/api/healthz');

        $response->assertStatus(200);
        $timing = $response->headers->get('X-Response-Time');
        $this->assertNotNull($timing);
        $this->assertStringEndsWith('ms', $timing);
    }
}
