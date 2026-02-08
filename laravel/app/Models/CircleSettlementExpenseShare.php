<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CircleSettlementExpenseShare extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'expense_id',
        'member_id',
        'member_snapshot_name',
        'share_yen',
        'created_at',
    ];

    protected $casts = [
        'share_yen' => 'integer',
        'created_at' => 'datetime',
    ];

    public function expense(): BelongsTo
    {
        return $this->belongsTo(CircleSettlementExpense::class, 'expense_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'member_id');
    }
}
