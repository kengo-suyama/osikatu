<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SplitBill extends Model
{
    use HasFactory;

    protected $fillable = [
        'circle_id',
        'title',
        'due_at',
        'is_active',
    ];

    protected $casts = [
        'due_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(BillAssignment::class, 'bill_id');
    }
}
