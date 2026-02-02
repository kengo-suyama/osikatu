<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

final class UserBudget extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'year_month',
        'budget_int',
        'spent_int',
        'currency',
    ];

    protected $casts = [
        'budget_int' => 'integer',
        'spent_int' => 'integer',
    ];

    public function getBudgetAttribute(): int
    {
        return $this->budget_int;
    }

    public function getSpentAttribute(): int
    {
        return $this->spent_int;
    }
}
