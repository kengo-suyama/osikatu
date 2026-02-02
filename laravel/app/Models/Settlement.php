<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Settlement extends Model
{
    use HasFactory;

    protected $fillable = [
        'circle_id',
        'created_by',
        'title',
        'amount_int',
        'currency',
        'settled_at',
    ];

    protected $casts = [
        'settled_at' => 'date',
        'amount_int' => 'integer',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function createdByMember(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(SettlementParticipant::class);
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(SettlementTransfer::class);
    }
}
