<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'bill_id',
        'circle_member_id',
        'amount_yen',
        'paid_at',
    ];

    protected $casts = [
        'amount_yen' => 'integer',
        'paid_at' => 'datetime',
    ];

    public function bill(): BelongsTo
    {
        return $this->belongsTo(SplitBill::class, 'bill_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'circle_member_id');
    }
}
