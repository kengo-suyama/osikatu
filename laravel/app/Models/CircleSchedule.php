<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CircleSchedule extends Model
{
    protected $fillable = [
        'circle_id',
        'created_by',
        'title',
        'start_at',
        'end_at',
        'is_all_day',
        'note',
        'location',
        'visibility',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'is_all_day' => 'boolean',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(CircleScheduleParticipant::class);
    }
}
