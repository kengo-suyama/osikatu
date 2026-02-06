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
 * @property string $name
 * @property string $category
 * @property \Illuminate\Support\Carbon $purchase_date
 * @property int $price
 * @property string|null $image_path
 * @property string|null $memo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read User $user
 * @property-read Oshi $oshi
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Attachment> $attachments
 */
class Good extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'oshi_id',
        'name',
        'category',
        'purchase_date',
        'price',
        'image_path',
        'memo',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'price' => 'integer',
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
