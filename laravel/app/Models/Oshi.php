<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string|null $category
 * @property string|null $color
 * @property string|null $image_path
 * @property string|null $memo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read User $user
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Schedule> $schedules
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Expense> $expenses
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Good> $goods
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Diary> $diaries
 */
class Oshi extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'category',
        'is_primary',
        'color',
        'image_path',
        'image_frame_id',
        'memo',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function goods(): HasMany
    {
        return $this->hasMany(Good::class);
    }

    public function diaries(): HasMany
    {
        return $this->hasMany(Diary::class);
    }
}
