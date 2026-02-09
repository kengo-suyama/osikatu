<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\PointsTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PointsService
{
    /**
     * Append a points ledger record.
     *
     * - Uses a DB transaction and locks the user row to avoid concurrent balance races.
     * - Optional idempotencyKey prevents duplicate grants (same user + circle + key).
     */
    public static function add(
        int $userId,
        ?int $circleId,
        int $delta,
        string $reason,
        ?array $sourceMeta = null,
        ?string $requestId = null,
        ?string $idempotencyKey = null
    ): PointsTransaction {
        $reason = trim($reason);
        if ($reason === '') {
            $reason = 'unknown';
        }

        $idempotencyKey = is_string($idempotencyKey) ? trim($idempotencyKey) : null;
        if ($idempotencyKey === '') {
            $idempotencyKey = null;
        }

        $requestId = is_string($requestId) ? trim($requestId) : null;
        if ($requestId === '') {
            $requestId = null;
        }

        $sourceMeta = self::sanitizeMeta($sourceMeta);

        return DB::transaction(function () use (
            $userId,
            $circleId,
            $delta,
            $reason,
            $sourceMeta,
            $requestId,
            $idempotencyKey
        ) {
            $user = User::query()->whereKey($userId)->lockForUpdate()->first();
            if (!$user) {
                // Keep behavior consistent with other services: fail loudly inside transaction.
                throw new \RuntimeException('User not found');
            }

            if ($idempotencyKey !== null) {
                $existing = PointsTransaction::query()
                    ->where('user_id', $userId)
                    ->where('circle_id', $circleId)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();
                if ($existing) {
                    return $existing;
                }
            }

            return PointsTransaction::create([
                'user_id' => $userId,
                'circle_id' => $circleId,
                'delta' => $delta,
                'reason' => $reason,
                'source_meta' => $sourceMeta,
                'request_id' => $requestId,
                'idempotency_key' => $idempotencyKey,
            ]);
        });
    }

    /**
     * @return array<string, scalar>|null
     */
    private static function sanitizeMeta(?array $meta): ?array
    {
        if (!$meta) {
            return null;
        }

        $out = [];
        foreach ($meta as $key => $value) {
            if (!is_string($key)) {
                continue;
            }
            if (is_bool($value) || is_int($value) || is_float($value) || is_string($value)) {
                $out[$key] = $value;
            }
        }

        if (empty($out)) {
            return null;
        }

        $encoded = json_encode($out, JSON_UNESCAPED_UNICODE);
        if ($encoded === false || strlen($encoded) > 1024) {
            return null;
        }

        return $out;
    }
}

