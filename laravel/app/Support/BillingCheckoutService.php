<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;

interface BillingCheckoutService
{
    public function createCheckoutUrl(User $user): string;
}

