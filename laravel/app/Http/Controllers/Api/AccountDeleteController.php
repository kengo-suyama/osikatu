<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use Illuminate\Support\Facades\Log;

class AccountDeleteController extends Controller
{
    public function destroy()
    {
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        Log::info('account_deleted', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        // Soft delete — data preserved for compliance
        $user->delete();

        return ApiResponse::success(['status' => 'deleted']);
    }
}
