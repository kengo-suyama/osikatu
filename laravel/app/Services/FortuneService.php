<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DailyFortune;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class FortuneService
{
    private array $colors = ['gold', 'blue', 'pink', 'green', 'silver', 'purple', 'orange', 'brown', 'red', 'cyan'];
    private array $items = ['earphones', 'pen', 'notebook', 'planner', 'coffee', 'amulet', 'rubber band', 'phone', 'card', 'keychain'];
    private array $messages = [
        'Today is excellent for focus; break tasks into small steps.',
        'New conversations bring luck?just say hello.',
        'Taking it slow and steady will bring a good result.',
        'Short breaks spark new ideas.',
        'Collaborate and the path clears.',
        'Embrace challenges; luck is on your side.',
        'Leave past mistakes behind and find your direction.',
        'Preparedness keeps the day calm.',
        'Asking for help unlocks insights.',
        'Start with a smile and the rest follows.',
    ];
    private array $goodActions = ['Break tasks into three', 'Act on intuition', 'Ask someone for help', 'Visit a new cafe', 'Take one more step forward'];
    private array $badActions = ['Respond impulsively', 'Proceed without prep', 'Ignore others views', 'Bite your tongue too hard', 'Forget to breathe deep'];

    public function getOrCreate(User $user, Carbon $date): DailyFortune
    {
        $dateKey = $date->toDateString();
        $existing = DailyFortune::query()
            ->where('user_id', $user->id)
            ->whereDate('fortune_date', $dateKey)
            ->first();

        if ($existing) {
            return $existing;
        }

        return DailyFortune::create($this->buildAttributes($user, $date) + [
            'user_id' => $user->id,
            'fortune_date' => $dateKey,
        ]);
    }

    public function findInRange(User $user, Carbon $from, Carbon $to): Collection
    {
        $fromAt = $from->copy()->startOfDay();
        $toAt = $to->copy()->endOfDay();

        return DailyFortune::query()
            ->where('user_id', $user->id)
            ->whereBetween('fortune_date', [$fromAt, $toAt])
            ->orderByDesc('fortune_date')
            ->get();
    }

    private function buildAttributes(User $user, Carbon $date): array
    {
        $seed = $this->seedFromUserAndDate($user->id, $date);
        $luckScore = $seed % 101;
        return [
            'fortune_date' => $date->toDateString(),
            'luck_score' => $luckScore,
            'lucky_color' => $this->pick($this->colors, $seed, 1),
            'lucky_item' => $this->pick($this->items, $seed, 2),
            'message' => $this->pick($this->messages, $seed, 3),
            'good_action' => $this->pick($this->goodActions, $seed, 4),
            'bad_action' => $this->pick($this->badActions, $seed, 5),
        ];
    }

    private function seedFromUserAndDate(int $userId, Carbon $date): int
    {
        $seed = (string) $userId . '|' . $date->toDateString();
        return abs(crc32($seed));
    }

    private function pick(array $values, int $seed, int $offset): string
    {
        if (count($values) === 0) {
            return '';
        }
        $index = ($seed + $offset * 31) % count($values);
        return $values[$index];
    }
}
