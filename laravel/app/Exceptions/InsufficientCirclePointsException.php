<?php

declare(strict_types=1);

namespace App\Exceptions;

class InsufficientCirclePointsException extends \RuntimeException
{
    public int $balance;
    public int $required;

    public function __construct(int $balance, int $required)
    {
        parent::__construct("Insufficient circle points: balance={$balance}, required={$required}");
        $this->balance = $balance;
        $this->required = $required;
    }
}
