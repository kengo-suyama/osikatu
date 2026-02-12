<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DbRestoreSmokeCommand extends Command
{
    protected $signature = 'db:restore-smoke {file? : Path to backup .sql.gz file} {--dry-run : Show what would happen}';
    protected $description = 'Verify a backup file can be read and optionally smoke-test table counts';

    public function handle(): int
    {
        $file = $this->argument('file');
        $dryRun = $this->option('dry-run');

        if ($dryRun || !$file) {
            $this->info('[SMOKE TEST] Checking current database tables...');

            $driver = config('database.default');
            if ($driver === 'sqlite') {
                $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
                $tableNames = array_map(fn($t) => $t->name, $tables);
            } else {
                $tables = DB::select('SHOW TABLES');
                $tableNames = array_map(fn($t) => array_values((array) $t)[0], $tables);
            }

            $this->line('Tables found: ' . count($tableNames));

            foreach ($tableNames as $tableName) {
                $count = DB::table($tableName)->count();
                $this->line("  {$tableName}: {$count} rows");
            }

            if (!$file) {
                $this->info('No file specified. Pass a .sql.gz file to verify it.');
            } else {
                $this->info("[DRY RUN] Would restore from: {$file}");
                if (!file_exists($file)) {
                    $this->error("File not found: {$file}");
                    return self::FAILURE;
                }
                $size = round(filesize($file) / 1024 / 1024, 2);
                $this->line("File size: {$size} MB");
            }

            return self::SUCCESS;
        }

        if (!file_exists($file)) {
            $this->error("File not found: {$file}");
            return self::FAILURE;
        }

        $this->warn("This will OVERWRITE the current database. Use only on test/dev databases.");
        if (!$this->confirm('Are you sure?')) {
            $this->info('Aborted.');
            return self::SUCCESS;
        }

        $host = config('database.connections.mysql.host', '127.0.0.1');
        $port = config('database.connections.mysql.port', '3306');
        $database = config('database.connections.mysql.database', 'osikatu');
        $username = config('database.connections.mysql.username', 'root');

        $cmd = sprintf(
            'gunzip -c %s | mysql -h %s -P %s -u %s %s',
            escapeshellarg($file),
            escapeshellarg((string) $host),
            escapeshellarg((string) $port),
            escapeshellarg((string) $username),
            escapeshellarg((string) $database)
        );

        $this->info("Restoring from {$file}...");
        $exitCode = 0;
        passthru($cmd, $exitCode);

        if ($exitCode !== 0) {
            $this->error("Restore failed with exit code {$exitCode}.");
            return self::FAILURE;
        }

        $this->info('Restore completed.');
        return self::SUCCESS;
    }
}
