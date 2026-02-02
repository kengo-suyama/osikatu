<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

final class UserSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'start_at',
        'end_at',
        'is_all_day',
        'note',
        'location',
        'remind_at',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'remind_at' => 'datetime',
        'is_all_day' => 'boolean',
    ];
}
