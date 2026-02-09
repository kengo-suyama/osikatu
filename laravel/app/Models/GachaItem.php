<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class GachaItem extends Model
{
    protected $fillable = [
        'item_type',
        'item_key',
        'name',
        'rarity',
        'description',
        'thumbnail_url',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function pools(): BelongsToMany
    {
        return $this->belongsToMany(GachaPool::class, 'gacha_pool_items', 'item_id', 'pool_id')
            ->withPivot('weight')
            ->withTimestamps();
    }
}
