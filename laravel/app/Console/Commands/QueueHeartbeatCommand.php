<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class QueueHeartbeatCommand extends Command
{
    protected $signature = 'queue:heartbeat';
    protected $description = 'Update queue worker heartbeat timestamp in cache';

    public function handle(): int
    {
        Cache::put('queue_heartbeat_ts', now()->timestamp, 300);
        $this->info('Queue heartbeat updated.');
        return self::SUCCESS;
    }
}
