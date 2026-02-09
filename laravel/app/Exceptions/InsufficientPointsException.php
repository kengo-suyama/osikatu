<?php

declare(strict_types=1);

namespace App\Exceptions;

final class InsufficientPointsException extends \RuntimeException
{
    public function __construct(
        public readonly int $balance,
        public readonly int $required,
        string $message = 'Insufficient points'
    ) {
        parent::__construct($message);
    }
}

