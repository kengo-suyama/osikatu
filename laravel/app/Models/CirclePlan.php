<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CirclePlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'circle_id',
        'title',
        'event_at',
        'is_active',
    ];

    protected $casts = [
        'event_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function rsvps(): HasMany
    {
        return $this->hasMany(PlanRsvp::class, 'plan_id');
    }
}
