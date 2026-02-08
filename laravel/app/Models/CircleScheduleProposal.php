<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CircleScheduleProposal extends Model
{
    protected $fillable = [
        'circle_id',
        'created_by_member_id',
        'title',
        'start_at',
        'end_at',
        'is_all_day',
        'note',
        'location',
        'status',
        'reviewed_by_member_id',
        'reviewed_at',
        'review_comment',
        'approved_schedule_id',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'is_all_day' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function createdByMember(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'created_by_member_id');
    }

    public function reviewedByMember(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'reviewed_by_member_id');
    }
}
