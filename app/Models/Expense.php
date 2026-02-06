<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $user_id
 * @property int $oshi_id
 * @property string $category
 * @property int $amount
 * @property \Illuminate\Support\Carbon $expense_date
 * @property string|null $memo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read User $user
 * @property-read Oshi $oshi
 */
class Expense extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'oshi_id',
        'category',
        'amount',
        'expense_date',
        'memo',
    ];

    protected $casts = [
        'amount' => 'integer',
        'expense_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function oshi(): BelongsTo
    {
        return $this->belongsTo(Oshi::class);
    }
}
