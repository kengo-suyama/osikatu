<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PersonalMoneyEntry extends Model
{
    use SoftDeletes;

    protected $table = 'personal_money_entries';

    protected $fillable = [
        'user_id',
        'date',
        'type',
        'amount_jpy',
        'category',
        'note',
    ];

    protected $casts = [
        'date' => 'date',
        'amount_jpy' => 'integer',
    ];
}
