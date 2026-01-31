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
 * @property bool $schedule_notify
 * @property bool $expense_alert
 * @property int|null $budget_limit
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read User $user
 * @property-read Oshi $oshi
 */
class NotificationSetting extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'oshi_id',
        'schedule_notify',
        'expense_alert',
        'budget_limit',
    ];

    protected $casts = [
        'schedule_notify' => 'boolean',
        'expense_alert' => 'boolean',
        'budget_limit' => 'integer',
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
