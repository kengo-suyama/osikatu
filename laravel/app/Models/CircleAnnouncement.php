<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CircleAnnouncement extends Model
{
    use HasFactory;

    protected $fillable = [
        'circle_id',
        'text',
        'updated_by_member_id',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'updated_by_member_id');
    }
}
