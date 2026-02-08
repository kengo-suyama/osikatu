<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CirclePin extends Model
{
    protected $table = 'circle_pins';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'circle_id',
        'created_by_member_id',
        'title',
        'url',
        'body',
        'checklist_json',
        'sort_order',
        'pinned_at',
        'source_post_id',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'circle_id' => 'integer',
        'created_by_member_id' => 'integer',
        'source_post_id' => 'integer',
        'sort_order' => 'integer',
        'checklist_json' => 'array',
        'pinned_at' => 'datetime',
    ];
}

