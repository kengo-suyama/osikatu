<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\BillingCheckoutService;
use App\Support\CurrentUser;
use Illuminate\Http\Request;

class BillingCheckoutController extends Controller
{
    public function create(Request $request, BillingCheckoutService $service)
    {
        $deviceId = (string) $request->header('X-Device-Id', '');
        if ($deviceId === '') {
            return ApiResponse::error('VALIDATION_ERROR', 'X-Device-Id is required.', null, 422);
        }

        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $isGuest = str_starts_with($user->email, 'device-') && str_ends_with($user->email, '@osikatu.local');
        if ($isGuest) {
            return ApiResponse::error('AUTH_REQUIRED', 'Account is required to start checkout.', null, 401);
        }

        try {
            $url = $service->createCheckoutUrl($user, $deviceId);
        } catch (\Throwable $e) {
            return ApiResponse::error('BILLING_UNAVAILABLE', 'Billing is not available.', null, 503);
        }

        return ApiResponse::success([
            'url' => $url,
        ]);
    }
}
