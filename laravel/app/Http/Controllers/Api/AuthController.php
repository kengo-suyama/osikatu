<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthLinkToken;
use App\Models\AuthSession;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuthTokenService;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function session(Request $request)
    {
        $deviceId = (string) $request->header('X-Device-Id');
        $deviceId = trim($deviceId);
        if ($deviceId === '') {
            return ApiResponse::error('VALIDATION_ERROR', 'X-Device-Id is required.', null, 422);
        }

        // Ensure device has a backing user (current behavior).
        $profile = MeProfileResolver::resolve($deviceId);
        if (!$profile?->user_id) {
            return ApiResponse::error('AUTH_REQUIRED', 'Guest profile not ready.', null, 401);
        }

        $token = AuthTokenService::generateToken();
        $tokenHash = AuthTokenService::hashToken($token);

        AuthSession::create([
            'token_hash' => $tokenHash,
            'device_id' => $deviceId,
            'user_id' => (int) $profile->user_id,
            'expires_at' => now()->addDays(30),
        ]);

        return ApiResponse::success([
            'token' => $token,
        ], null, 201);
    }

    public function linkStart(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:72'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        // Already linked (non-device email)
        if (!$this->isGuestUser($user)) {
            return ApiResponse::error('ALREADY_LINKED', 'Account already linked.', null, 409);
        }

        $email = strtolower(trim((string) $data['email']));

        $emailOwner = User::query()->where('email', $email)->first();
        if ($emailOwner && $emailOwner->id !== $user->id) {
            return ApiResponse::error('EMAIL_IN_USE', 'Email is already in use.', null, 409);
        }

        $plain = AuthTokenService::generateToken();
        $hash = AuthTokenService::hashToken($plain);

        AuthLinkToken::create([
            'user_id' => (int) $user->id,
            'token_hash' => $hash,
            'email' => $email,
            'password_hash' => Hash::make((string) $data['password']),
            'expires_at' => now()->addMinutes(30),
        ]);

        return ApiResponse::success([
            'linkToken' => $plain,
        ], null, 201);
    }

    public function linkComplete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'linkToken' => ['required', 'string', 'min:16', 'max:128'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $linkToken = (string) $validator->validated()['linkToken'];
        $linkHash = AuthTokenService::hashToken($linkToken);

        $record = AuthLinkToken::query()
            ->where('token_hash', $linkHash)
            ->first();

        if (!$record) {
            return ApiResponse::error('INVALID_LINK_TOKEN', 'Invalid link token.', null, 422);
        }

        if ($record->used_at !== null) {
            return ApiResponse::error('INVALID_LINK_TOKEN', 'Link token already used.', null, 422);
        }

        if ($record->expires_at->isPast()) {
            return ApiResponse::error('INVALID_LINK_TOKEN', 'Link token expired.', null, 422);
        }

        $user = User::query()->find(CurrentUser::id());
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        if ((int) $record->user_id !== (int) $user->id) {
            return ApiResponse::error('FORBIDDEN', 'Forbidden.', null, 403);
        }

        $user->email = $record->email;
        $user->password = $record->password_hash;
        $user->save();

        $record->used_at = now();
        $record->save();

        // Return updated me payload.
        return app(MeController::class)->show();
    }

    private function isGuestUser(User $user): bool
    {
        return str_starts_with($user->email, 'device-') && str_ends_with($user->email, '@osikatu.local');
    }
}

