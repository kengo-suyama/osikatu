<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\Entitlements;
use App\Support\PlanGate;
use Illuminate\Http\Request;

class BillingDebugController extends Controller
{
    public function show(Request $request)
    {
        // Only allow in local/testing environments
        if (!in_array(app()->environment(), ['local', 'testing'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Debug endpoint is only available in local environment.', null, 403);
        }

        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        return ApiResponse::success([
            'userId' => $user->id,
            'plan' => $user->plan ?? 'free',
            'effectivePlan' => Entitlements::effectivePlan($user),
            'planStatus' => $user->plan_status ?? 'active',
            'trialEndsAt' => $user->trial_ends_at?->toIso8601String(),
            'hasPremium' => PlanGate::hasPremium($user),
            'hasPlus' => PlanGate::hasPlus($user),
            'quotas' => Entitlements::quotas($user),
            'features' => Entitlements::features($user),
        ]);
    }
}
