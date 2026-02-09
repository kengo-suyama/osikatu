<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CirclePointsBalance;
use App\Models\CirclePointsLedger;
use Illuminate\Support\Facades\DB;

final class CirclePointsService
{
    public static function balance(int $circleId): int
    {
        $row = CirclePointsBalance::query()->find($circleId);
        return $row ? (int) $row->balance : 0;
    }

    public static function add(int $circleId, ?int $actorUserId, int $delta, string $reason, ?array $meta = null): CirclePointsLedger
    {
        return DB::transaction(function () use ($circleId, $actorUserId, $delta, $reason, $meta) {
            $bal = CirclePointsBalance::query()->lockForUpdate()->find($circleId);

            if (!$bal) {
                $bal = CirclePointsBalance::create([
                    'circle_id' => $circleId,
                    'balance' => 0,
                ]);
                $bal = CirclePointsBalance::query()->lockForUpdate()->find($circleId);
            }

            $ledger = CirclePointsLedger::create([
                'circle_id' => $circleId,
                'actor_user_id' => $actorUserId,
                'delta' => $delta,
                'reason' => $reason,
                'meta' => $meta,
            ]);

            $bal->balance = (int) $bal->balance + $delta;
            $bal->updated_at = now();
            $bal->save();

            return $ledger;
        });
    }

    public static function deduct(int $circleId, ?int $actorUserId, int $cost, string $reason, ?array $meta = null): CirclePointsLedger
    {
        return DB::transaction(function () use ($circleId, $actorUserId, $cost, $reason, $meta) {
            $bal = CirclePointsBalance::query()->lockForUpdate()->find($circleId);
            $current = $bal ? (int) $bal->balance : 0;

            if ($current < $cost) {
                throw new \App\Exceptions\InsufficientCirclePointsException($current, $cost);
            }

            return self::add($circleId, $actorUserId, -$cost, $reason, $meta);
        });
    }
}
