<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MePlanController extends Controller
{
    public function show()
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        return ApiResponse::success([
            'plan' => $user->plan ?? 'free',
            'planStatus' => $user->plan_status ?? 'active',
            'trialEndsAt' => $user->trial_ends_at?->toIso8601String(),
        ]);
    }

    public function update(Request $request)
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $validator = Validator::make($request->all(), [
            'plan' => ['required', 'in:free,premium,plus'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $user->plan = $data['plan'];
        $user->plan_status = 'active';
        $user->save();

        return ApiResponse::success([
            'plan' => $user->plan,
            'planStatus' => $user->plan_status ?? 'active',
            'trialEndsAt' => $user->trial_ends_at?->toIso8601String(),
        ]);
    }

    public function cancel()
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $user->plan = 'free';
        $user->plan_status = 'canceled';
        $user->save();

        return ApiResponse::success([
            'plan' => $user->plan,
            'planStatus' => $user->plan_status ?? 'canceled',
            'trialEndsAt' => $user->trial_ends_at?->toIso8601String(),
        ]);
    }
}
