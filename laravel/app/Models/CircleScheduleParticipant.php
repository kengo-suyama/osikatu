<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CircleScheduleParticipant extends Model
{
    protected $fillable = [
        'circle_schedule_id',
        'user_id',
        'status',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(CircleSchedule::class, 'circle_schedule_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
