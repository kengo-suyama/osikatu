<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookEventReceipt extends Model
{
    protected $fillable = [
        'stripe_event_id',
        'event_type',
        'status',
    ];
}
