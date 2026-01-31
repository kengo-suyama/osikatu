<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanRsvp extends Model
{
    use HasFactory;

    protected $fillable = [
        'plan_id',
        'circle_member_id',
        'status',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(CirclePlan::class, 'plan_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'circle_member_id');
    }
}
