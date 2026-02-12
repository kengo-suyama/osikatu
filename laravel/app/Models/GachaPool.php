<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class GachaPool extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'description',
        'cost',
        'is_active',
    ];

    protected $casts = [
        'cost' => 'integer',
        'is_active' => 'boolean',
    ];

    public function items(): BelongsToMany
    {
        return $this->belongsToMany(GachaItem::class, 'gacha_pool_items', 'pool_id', 'item_id')
            ->withPivot('weight')
            ->withTimestamps();
    }
}
