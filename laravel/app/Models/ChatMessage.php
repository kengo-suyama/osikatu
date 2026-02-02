<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatMessage extends Model
{
    protected $fillable = [
        'circle_id',
        'sender_member_id',
        'body',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public $timestamps = false;

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function senderMember(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'sender_member_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ChatMessageMedia::class);
    }
}
