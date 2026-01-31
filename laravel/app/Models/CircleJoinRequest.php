<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CircleJoinRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'circle_id',
        'me_profile_id',
        'status',
        'message',
        'reviewed_by_member_id',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function meProfile(): BelongsTo
    {
        return $this->belongsTo(MeProfile::class);
    }

    public function reviewedByMember(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'reviewed_by_member_id');
    }
}
