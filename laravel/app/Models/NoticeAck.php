<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoticeAck extends Model
{
    use HasFactory;

    protected $fillable = [
        'notice_id',
        'circle_member_id',
        'acked_at',
    ];

    protected $casts = [
        'acked_at' => 'datetime',
    ];

    public function notice(): BelongsTo
    {
        return $this->belongsTo(CircleNotice::class, 'notice_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'circle_member_id');
    }
}
