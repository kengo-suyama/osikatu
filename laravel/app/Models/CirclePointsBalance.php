<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CirclePointsBalance extends Model
{
    protected $primaryKey = 'circle_id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'circle_id',
        'balance',
        'updated_at',
    ];

    protected $casts = [
        'updated_at' => 'datetime',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }
}
