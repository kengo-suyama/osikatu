<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'me_profile_id',
        'source_type',
        'source_id',
        'notify_at',
        'type',
        'title',
        'body',
        'link_url',
        'action_url',
        'read_at',
    ];

    protected $casts = [
        'notify_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    public function meProfile(): BelongsTo
    {
        return $this->belongsTo(MeProfile::class);
    }
}
