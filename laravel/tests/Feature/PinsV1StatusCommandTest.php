<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PinsV1StatusCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_command_prints_mode_and_config_cached(): void
    {
        config(['pins.v1_write_mode' => 'deny']);

        $this->artisan('pins:v1-status')
            ->expectsOutputToContain('pins.v1_write_mode=deny')
            ->expectsOutputToContain('config_cached=')
            ->expectsOutputToContain('NOTE: env change may require: php artisan config:cache')
            ->assertExitCode(0);
    }
}

