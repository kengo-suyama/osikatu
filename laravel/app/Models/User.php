<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Oshi> $oshis
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Schedule> $schedules
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Expense> $expenses
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Good> $goods
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Diary> $diaries
 */
class User extends Authenticatable
{
    use HasFactory;
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'plan',
        'trial_ends_at',
        'ui_theme_id',
        'ui_special_bg_enabled',
        'display_name',
        'avatar_path',
        'bio',
        'prefecture_code',
        'onboarding_completed_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'trial_ends_at' => 'datetime',
        'ui_special_bg_enabled' => 'boolean',
        'prefecture_code' => 'integer',
        'onboarding_completed_at' => 'datetime',
    ];

    public function oshis(): HasMany
    {
        return $this->hasMany(Oshi::class);
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
