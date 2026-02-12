<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CircleGachaDraw extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'circle_id',
        'actor_user_id',
        'cost_points',
        'reward_key',
        'reward_rarity',
        'meta',
        'created_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'created_at' => 'datetime',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }
}
