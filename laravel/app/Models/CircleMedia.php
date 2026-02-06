<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CircleMedia extends Model
{
    use HasFactory;

    protected $table = 'circle_media';

    public $timestamps = false;

    protected $fillable = [
        'circle_id',
        'created_by_member_id',
        'type',
        'path',
        'url',
        'mime',
        'size_bytes',
        'width',
        'height',
        'caption',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'size_bytes' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    public function circle(): BelongsTo
    {
        return $this->belongsTo(Circle::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(CircleMember::class, 'created_by_member_id');
    }
}
