<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillingSubscription;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\BillingPortalService;
use App\Support\CurrentUser;
use Illuminate\Http\Request;

class BillingPortalController extends Controller
{
    public function create(Request $request, BillingPortalService $service)
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
            return ApiResponse::error('AUTH_REQUIRED', 'Account is required to manage billing.', null, 401);
        }

        $sub = BillingSubscription::query()
            ->where('user_id', $user->id)
            ->whereNotNull('stripe_customer_id')
            ->orderByDesc('id')
            ->first();

        if (!$sub?->stripe_customer_id) {
            return ApiResponse::error('BILLING_NOT_READY', 'Billing customer is not ready.', null, 400);
        }

        try {
            $url = $service->createPortalUrl((string) $sub->stripe_customer_id);
        } catch (\Throwable $e) {
            return ApiResponse::error('BILLING_UNAVAILABLE', 'Billing is not available.', null, 503);
        }

        return ApiResponse::success([
            'url' => $url,
        ]);
    }
}

