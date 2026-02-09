<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAlbum extends Model
{
    use HasFactory;

    protected $table = 'user_albums';

    protected $fillable = [
        'user_id',
        'date',
        'note',
        'media',
    ];

    protected $casts = [
        'media' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

