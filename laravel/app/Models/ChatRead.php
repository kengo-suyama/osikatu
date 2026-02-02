<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatRead extends Model
{
    protected $fillable = [
        'circle_id',
        'circle_member_id',
        'last_read_at',
        'created_at',
    ];

    protected $casts = [
        'last_read_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public $timestamps = false;

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'circle_member_id');
    }
}
