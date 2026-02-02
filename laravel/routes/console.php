<?php

use App\Console\Commands\DispatchScheduleNotifications;
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
