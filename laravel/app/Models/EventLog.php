<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventLog extends Model
{
    protected $fillable = [
        'me_profile_id',
        'circle_id',
        'event_name',
        'screen',
        'meta',
        'created_at',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public $timestamps = false;
}
