<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class DbBackupCommandTest extends TestCase
{
    public function test_backup_dry_run_shows_command(): void
    {
        $this->artisan('db:backup', ['--dry-run' => true])
            ->assertSuccessful()
            ->expectsOutputToContain('DRY RUN');
    }

    public function test_restore_smoke_dry_run_shows_tables(): void
    {
        $this->artisan('db:restore-smoke', ['--dry-run' => true])
            ->assertSuccessful()
            ->expectsOutputToContain('SMOKE TEST');
    }
}
