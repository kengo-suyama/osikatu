<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'circle_id',
        'author_member_id',
        'user_id',
        'post_type',
        'body',
        'tags',
        'is_pinned',
        'pin_kind',
        'pin_due_at',
        'like_count',
    ];

    protected $casts = [
        'tags' => 'array',
        'is_pinned' => 'boolean',
        'pin_due_at' => 'datetime',
        'like_count' => 'integer',
        'post_type' => 'string',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function authorMember(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'author_member_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(PostMedia::class);
    }

    public function acks(): HasMany
    {
        return $this->hasMany(PostAck::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(PostLike::class);
    }
}
