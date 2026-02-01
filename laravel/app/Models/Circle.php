<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Circle extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'oshi_label',
        'oshi_tag',
        'oshi_tags',
        'is_public',
        'join_policy',
        'icon_path',
        'max_members',
        'plan',
        'plan_required',
        'last_activity_at',
        'created_by',
    ];

    protected $casts = [
        'max_members' => 'integer',
        'oshi_tags' => 'array',
        'is_public' => 'boolean',
        'last_activity_at' => 'datetime',
    ];

    public function members(): HasMany
    {
        return $this->hasMany(CircleMember::class);
    }

    public function invites(): HasMany
    {
        return $this->hasMany(CircleInvite::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function uiSetting(): HasOne
    {
        return $this->hasOne(CircleUiSetting::class);
    }
}
