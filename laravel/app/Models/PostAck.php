<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostAck extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'circle_member_id',
        'acked_at',
    ];

    protected $casts = [
        'acked_at' => 'datetime',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'circle_member_id');
    }
}
