<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PointsTransaction extends Model
{
    protected $table = 'points_transactions';

    protected $fillable = [
        'user_id',
        'circle_id',
        'delta',
        'reason',
        'source_meta',
        'request_id',
        'idempotency_key',
        'created_at',
    ];

    protected $casts = [
        'source_meta' => 'array',
        'created_at' => 'datetime',
    ];

    public $timestamps = false;
}

