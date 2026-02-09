<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class RequestMetricsJsonTest extends TestCase
{
    public function test_request_metrics_logged_with_fixed_fields(): void
    {
        Log::shouldReceive('info')
            ->once()
            ->withArgs(function (string $message, array $context) {
                if ($message !== 'request_metrics') {
                    return true; // Allow other log calls
                }
                return $context['type'] === 'request_metrics'
                    && isset($context['method'])
                    && isset($context['path'])
                    && isset($context['status'])
                    && isset($context['duration_ms'])
                    && array_key_exists('request_id', $context)
                    && array_key_exists('user_id', $context);
            });

        // Allow other log calls
        Log::shouldReceive('info')->andReturnNull();
        Log::shouldReceive('error')->andReturnNull();
        Log::shouldReceive('warning')->andReturnNull();

        $this->getJson('/api/healthz');
    }
}
