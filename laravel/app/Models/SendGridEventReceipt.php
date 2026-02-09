<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SendGridEventReceipt extends Model
{
    protected $table = 'sendgrid_event_receipts';

    protected $fillable = [
        'event_type',
        'email',
        'sg_event_id',
        'event_timestamp',
        'raw_payload',
    ];

    protected function casts(): array
    {
        return [
            'raw_payload' => 'array',
            'event_timestamp' => 'datetime',
        ];
    }
}
