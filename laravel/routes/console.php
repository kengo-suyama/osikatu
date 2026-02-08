<?php

use App\Console\Commands\DispatchScheduleNotifications;
use App\Console\Commands\BackfillCirclePins;
use App\Console\Commands\PinsV1Status;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:dispatch-schedule-notifications', function () {
    $command = app(DispatchScheduleNotifications::class);
    $command->setLaravel(app());
    $command->setOutput($this->output);

    return $command->handle();
})->purpose('Dispatch schedule notifications');

Artisan::command('app:backfill-circle-pins {--dry-run}', function () {
    $dryRun = (bool) $this->option('dry-run');

    $result = app(BackfillCirclePins::class)->handle($dryRun);

    $this->info('Backfill complete.');
    $this->line('scanned: ' . ($result['scanned'] ?? 0));
    $this->line('upserted: ' . ($result['upserted'] ?? 0));

    return 0;
})->purpose('Backfill circle_pins from legacy pinned posts');

Artisan::command('pins:v1-status', function () {
    $result = app(PinsV1Status::class)->handle();

    $this->line('pins.v1_write_mode=' . ($result['mode'] ?? 'delegate'));
    $this->line('config_cached=' . ((bool) ($result['configCached'] ?? false) ? 'true' : 'false'));
    $this->line('NOTE: env change may require: php artisan config:cache');

    return 0;
})->purpose('Show pins-v1 write mode and whether config is cached');
