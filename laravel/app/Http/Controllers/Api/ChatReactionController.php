<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\CircleMember;
use App\Models\MessageReaction;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ChatReactionController extends Controller
{
    public function store(Request $request, int $messageId)
    {
        $userId = $this->resolveUserId($request);
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Authentication required.', null, 401);
        }

        $message = ChatMessage::find($messageId);
        if (!$message) {
            return ApiResponse::error('NOT_FOUND', 'Message not found.', null, 404);
        }

        if (!$this->isMember($message->circle_id, $request)) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $validator = Validator::make($request->all(), [
            'emoji' => ['required', 'string', 'max:20'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $emoji = $request->input('emoji');

        MessageReaction::firstOrCreate([
            'message_id' => $messageId,
            'user_id' => $userId,
            'emoji' => $emoji,
        ], [
            'created_at' => now(),
        ]);

        $counts = $this->reactionCounts($messageId, $userId);

        return ApiResponse::success($counts, null, 201);
    }

    public function destroy(Request $request, int $messageId)
    {
        $userId = $this->resolveUserId($request);
        if (!$userId) {
            return ApiResponse::error('UNAUTHORIZED', 'Authentication required.', null, 401);
        }

        $message = ChatMessage::find($messageId);
        if (!$message) {
            return ApiResponse::error('NOT_FOUND', 'Message not found.', null, 404);
        }

        if (!$this->isMember($message->circle_id, $request)) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $validator = Validator::make($request->all(), [
            'emoji' => ['required', 'string', 'max:20'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $emoji = $request->input('emoji');

        MessageReaction::where('message_id', $messageId)
            ->where('user_id', $userId)
            ->where('emoji', $emoji)
            ->delete();

        $counts = $this->reactionCounts($messageId, $userId);

        return ApiResponse::success($counts);
    }

    private function reactionCounts(int $messageId, int $userId): array
    {
        $reactions = MessageReaction::where('message_id', $messageId)->get();

        $counts = [];
        $myReacted = [];

        foreach ($reactions as $reaction) {
            $emoji = $reaction->emoji;
            if (!isset($counts[$emoji])) {
                $counts[$emoji] = 0;
            }
            $counts[$emoji]++;
            if ($reaction->user_id === $userId) {
                $myReacted[] = $emoji;
            }
        }

        return [
            'messageId' => $messageId,
            'counts' => empty($counts) ? (object) [] : $counts,
            'myReacted' => array_values(array_unique($myReacted)),
        ];
    }

    private function resolveUserId(Request $request): ?int
    {
        $deviceId = $request->header('X-Device-Id');
        if ($deviceId) {
            $profile = MeProfileResolver::resolve($deviceId);
            return $profile?->user_id;
        }
        return CurrentUser::id();
    }

    private function isMember(int $circleId, Request $request): bool
    {
        $deviceId = $request->header('X-Device-Id');
        if ($deviceId) {
            $profile = MeProfileResolver::resolve($deviceId);
            if ($profile) {
                return CircleMember::query()
                    ->where('circle_id', $circleId)
                    ->where('me_profile_id', $profile->id)
                    ->exists();
            }
        }

        $userId = CurrentUser::id();
        if (!$userId) {
            return false;
        }

        return CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('user_id', $userId)
            ->exists();
    }
}
