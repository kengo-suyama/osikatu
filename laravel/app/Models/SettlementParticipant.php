<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SettlementParticipant extends Model
{
    use HasFactory;

    protected $fillable = [
        'settlement_id',
        'user_id',
        'share_int',
        'is_payer',
    ];

    protected $casts = [
        'share_int' => 'integer',
        'is_payer' => 'boolean',
    ];

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(Settlement::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
