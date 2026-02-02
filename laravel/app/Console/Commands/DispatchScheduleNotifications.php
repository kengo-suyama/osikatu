<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\CircleSchedule;
use App\Models\CircleScheduleParticipant;
use App\Models\MeProfile;
use App\Models\Notification;
use App\Models\UserSchedule;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class DispatchScheduleNotifications extends Command
{
    protected $signature = 'app:dispatch-schedule-notifications';

    protected $description = 'Dispatch schedule notifications for upcoming events.';

    public function handle(): int
    {
        $result = self::dispatchNotifications();

        $this->info(sprintf('Created: %d, Skipped: %d', $result['created'], $result['skipped']));

        return self::SUCCESS;
    }

    public static function dispatchNotifications(): array
    {
        $now = Carbon::now('Asia/Tokyo');
        $windowEnd = $now->copy()->addHours(48);

        $created = 0;
        $skipped = 0;

        $userSchedules = UserSchedule::query()
            ->whereBetween('start_at', [$now, $windowEnd])
            ->get();

        foreach ($userSchedules as $schedule) {
            if (!$schedule->start_at || !$schedule->user_id) {
                continue;
            }

            $notifyAt = $schedule->start_at->copy()->setTimezone('Asia/Tokyo')->subMinutes(60);
            if ($notifyAt->greaterThan($now)) {
                continue;
            }

            $result = self::createNotification([
                'user_id' => $schedule->user_id,
                'me_profile_id' => self::resolveMeProfileId($schedule->user_id),
                'source_type' => 'user_schedule',
                'source_id' => $schedule->id,
                'notify_at' => $notifyAt,
                'link_url' => '/schedule',
            ]);

            $created += $result['created'];
            $skipped += $result['skipped'];
        }

        $circleSchedules = CircleSchedule::query()
            ->whereBetween('start_at', [$now, $windowEnd])
            ->get();

        foreach ($circleSchedules as $schedule) {
            if (!$schedule->start_at) {
                continue;
            }

            $notifyAt = $schedule->start_at->copy()->setTimezone('Asia/Tokyo')->subMinutes(60);
            if ($notifyAt->greaterThan($now)) {
                continue;
            }

            $participantIds = CircleScheduleParticipant::query()
                ->where('circle_schedule_id', $schedule->id)
                ->where('status', 'accepted')
                ->pluck('user_id')
                ->all();

            foreach ($participantIds as $userId) {
                $result = self::createNotification([
                    'user_id' => $userId,
                    'me_profile_id' => self::resolveMeProfileId($userId),
                    'source_type' => 'circle_schedule',
                    'source_id' => $schedule->id,
                    'notify_at' => $notifyAt,
                    'link_url' => '/circles/' . $schedule->circle_id . '/calendar',
                ]);

                $created += $result['created'];
                $skipped += $result['skipped'];
            }
        }

        return [
            'created' => $created,
            'skipped' => $skipped,
        ];
    }

    private static function createNotification(array $attributes): array
    {
        if (empty($attributes['me_profile_id'])) {
            return ['created' => 0, 'skipped' => 1];
        }

        $notification = Notification::query()->firstOrCreate(
            [
                'user_id' => $attributes['user_id'],
                'source_type' => $attributes['source_type'],
                'source_id' => $attributes['source_id'],
                'notify_at' => $attributes['notify_at'],
            ],
            [
                'me_profile_id' => $attributes['me_profile_id'],
                'type' => 'schedule.reminder',
                'title' => '予定のリマインド',
                'body' => 'まもなく予定があります。',
                'link_url' => $attributes['link_url'],
            ]
        );

        if ($notification->wasRecentlyCreated) {
            return ['created' => 1, 'skipped' => 0];
        }

        return ['created' => 0, 'skipped' => 1];
    }

    private static function resolveMeProfileId(int $userId): ?int
    {
        return MeProfile::query()->where('user_id', $userId)->value('id');
    }
}
