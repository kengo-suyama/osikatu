<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CircleSettlementExpense extends Model
{
    protected $fillable = [
        'circle_id',
        'created_by',
        'payer_member_id',
        'title',
        'amount_yen',
        'split_type',
        'occurred_on',
        'note',
        'status',
        'replaced_by_expense_id',
        'replaces_expense_id',
    ];

    protected $casts = [
        'amount_yen' => 'integer',
        'occurred_on' => 'date',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function payerMember(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'payer_member_id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(CircleSettlementExpenseShare::class, 'expense_id');
    }

    public function replacedBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaced_by_expense_id');
    }

    public function replaces(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaces_expense_id');
    }
}
