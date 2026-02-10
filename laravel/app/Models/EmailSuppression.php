<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailSuppression extends Model
{
    protected $fillable = ['email', 'reason', 'suppressed_at'];

    protected function casts(): array
    {
        return [
            'suppressed_at' => 'datetime',
        ];
    }

    public static function isSuppressed(string $email): bool
    {
        return static::where('email', strtolower(trim($email)))->exists();
    }

    public static function suppress(string $email, string $reason = 'bounce'): void
    {
        static::updateOrCreate(
            ['email' => strtolower(trim($email))],
            ['reason' => $reason, 'suppressed_at' => now()]
        );
    }
}
