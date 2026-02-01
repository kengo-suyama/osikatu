<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CircleUiSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'circle_id',
        'circle_theme_id',
        'special_bg_enabled',
        'special_bg_variant',
        'updated_by_user_id',
    ];

    protected $casts = [
        'special_bg_enabled' => 'boolean',
    ];
}
