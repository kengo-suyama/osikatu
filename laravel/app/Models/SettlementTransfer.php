<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SettlementTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'settlement_id',
        'from_user_id',
        'to_user_id',
        'amount_int',
        'status',
    ];

    protected $casts = [
        'amount_int' => 'integer',
    ];

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(Settlement::class);
    }

    public function fromMember(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function toMember(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }
}
