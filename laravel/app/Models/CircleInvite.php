<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CircleInvite extends Model
{
    use HasFactory;

    protected $fillable = [
        'circle_id',
        'type',
        'code',
        'token',
        'role',
        'expires_at',
        'revoked_at',
        'max_uses',
        'used_count',
        'created_by',
        'created_by_device_id',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
        'max_uses' => 'integer',
        'used_count' => 'integer',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }
}
