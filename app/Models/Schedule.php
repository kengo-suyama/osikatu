<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $user_id
 * @property int $oshi_id
 * @property string $title
 * @property string|null $description
 * @property \Illuminate\Support\Carbon $start_datetime
 * @property \Illuminate\Support\Carbon|null $end_datetime
 * @property int|null $notify_before_minutes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read User $user
 * @property-read Oshi $oshi
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Attachment> $attachments
 */
class Schedule extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'oshi_id',
        'title',
        'description',
        'start_datetime',
        'end_datetime',
        'notify_before_minutes',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
        'notify_before_minutes' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function oshi(): BelongsTo
    {
        return $this->belongsTo(Oshi::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'related');
    }
}
