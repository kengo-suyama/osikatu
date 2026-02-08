<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class OplogRequestIdIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_operation_logs_has_meta_request_id_column(): void
    {
        if (!Schema::hasTable('operation_logs')) {
            $this->markTestSkipped('operation_logs table does not exist');
        }

        $this->assertTrue(
            Schema::hasColumn('operation_logs', 'meta_request_id'),
            'operation_logs should have meta_request_id column'
        );
    }
}
