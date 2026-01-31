<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MeProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'device_id',
        'nickname',
        'avatar_url',
        'initial',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function circleMembers(): HasMany
    {
        return $this->hasMany(CircleMember::class);
    }
}
