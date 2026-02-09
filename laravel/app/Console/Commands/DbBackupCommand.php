<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DbBackupCommand extends Command
{
    protected $signature = 'db:backup {--dry-run : Show command without executing}';
    protected $description = 'Create a mysqldump backup of the database';

    public function handle(): int
    {
        $host = config('database.connections.mysql.host', '127.0.0.1');
        $port = config('database.connections.mysql.port', '3306');
        $database = config('database.connections.mysql.database', 'osikatu');
        $username = config('database.connections.mysql.username', 'root');

        $timestamp = now()->format('Ymd_His');
        $filename = "backup_{$database}_{$timestamp}.sql.gz";

        $cmd = sprintf(
            'mysqldump -h %s -P %s -u %s %s | gzip > %s',
            escapeshellarg((string) $host),
            escapeshellarg((string) $port),
            escapeshellarg((string) $username),
            escapeshellarg((string) $database),
            escapeshellarg($filename)
        );

        if ($this->option('dry-run')) {
            $this->info('[DRY RUN] Would execute:');
            $this->line($cmd);
            $this->line("Output file: {$filename}");
            return self::SUCCESS;
        }

        $this->info("Backing up database '{$database}' to {$filename}...");
        $this->warn('Note: You may be prompted for the MySQL password.');

        $exitCode = 0;
        passthru($cmd, $exitCode);

        if ($exitCode !== 0) {
            $this->error("Backup failed with exit code {$exitCode}.");
            return self::FAILURE;
        }

        $this->info("Backup completed: {$filename}");
        return self::SUCCESS;
    }
}
