<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\PlanGate;

class MeController extends Controller
{
    public function show()
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $trialActive = PlanGate::isTrialActive($user);
        $trialRemainingDays = 0;
        if ($trialActive && $user->trial_ends_at) {
            $trialRemainingDays = (int) ceil(now()->diffInSeconds($user->trial_ends_at, false) / 86400);
            $trialRemainingDays = max(0, $trialRemainingDays);
        }

        return ApiResponse::success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'plan' => $user->plan ?? 'free',
            'effectivePlan' => PlanGate::effectiveUserPlan($user),
            'trialEndsAt' => $user->trial_ends_at?->toIso8601String(),
            'trialActive' => $trialActive,
            'trialRemainingDays' => $trialRemainingDays,
        ]);
    }
}
