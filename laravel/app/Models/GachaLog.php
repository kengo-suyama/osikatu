<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GachaLog extends Model
{
    protected $fillable = [
        'user_id',
        'item_type',
        'item_key',
        'rarity',
        'is_new',
        'points_cost',
    ];

    protected $casts = [
        'is_new' => 'boolean',
        'points_cost' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
