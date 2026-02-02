<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyFortune extends Model
{
    protected $fillable = [
        'user_id',
        'fortune_date',
        'luck_score',
        'lucky_color',
        'lucky_item',
        'message',
        'good_action',
        'bad_action',
    ];

    protected $casts = [
        'fortune_date' => 'date',
        'luck_score' => 'integer',
    ];
}
