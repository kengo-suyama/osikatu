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
 * @property string $content
 * @property \Illuminate\Support\Carbon $diary_date
 * @property bool $is_locked
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read User $user
 * @property-read Oshi $oshi
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Attachment> $attachments
 */
class Diary extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'oshi_id',
        'title',
        'content',
        'diary_date',
        'is_locked',
    ];

    protected $casts = [
        'diary_date' => 'date',
        'is_locked' => 'boolean',
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
