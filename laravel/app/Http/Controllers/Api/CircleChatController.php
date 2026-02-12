<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatMessageResource;
use App\Models\ChatMessage;
use App\Models\ChatMessageMedia;
use App\Models\ChatRead;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\Post;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\ImageUploadService;
use App\Support\MeProfileResolver;
use App\Support\OperationLogService;
use App\Support\PlanGate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class CircleChatController extends Controller
{
    public function index(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $limit = (int) $request->query('limit', 50);
        $limit = max(1, min($limit, 100));
        $cursor = $request->query('cursor');

        $legacyItems = [];
        $includeLegacy = $cursor === null || $cursor === '';

        if ($includeLegacy) {
            $legacy = Post::query()
                ->where('circle_id', $circle)
                ->where('post_type', 'chat')
                ->with(['authorMember.meProfile', 'media'])
                ->orderBy('id')
                ->limit($limit)
                ->get();

            $legacyItems = $legacy->map(function (Post $post): array {
                $authorMember = $post->authorMember ?? null;
                $profile = $authorMember?->meProfile ?? null;
                $authorId = $authorMember?->id ?? $post->user_id ?? null;
                $authorName = $profile?->nickname ?? $post->user?->name ?? 'Member';
                $avatarUrl = $profile?->avatar_url ?? null;
                $media = $post->media ?? collect();
                $imageUrl = $media->first()?->url ?? null;

                return [
                    'id' => 'lg_' . $post->id,
                    'source' => 'legacy',
                    'circleId' => $post->circle_id,
                    'user' => [
                        'id' => $authorId,
                        'name' => $authorName,
                        'avatarUrl' => $avatarUrl,
                    ],
                    'author' => [
                        'id' => $authorId,
                        'name' => $authorName,
                        'avatarUrl' => $avatarUrl,
                    ],
                    'postType' => 'chat',
                    'body' => $post->body ?? '',
                    'tags' => [],
                    'media' => $media->map(fn ($item) => [
                        'id' => $item->id,
                        'type' => $item->type ?? 'image',
                        'url' => $item->url,
                    ])->values()->all(),
                    'imageUrl' => $imageUrl,
                    'likeCount' => 0,
                    'likedByMe' => false,
                    'isPinned' => false,
                    'pinKind' => null,
                    'pinDueAt' => null,
                    'deletedAt' => null,
                    'createdAt' => $post->created_at?->toIso8601String(),
                ];
            })->values()->all();
        }

        $query = ChatMessage::query()
            ->where('circle_id', $circle);

        if (is_numeric($cursor)) {
            $query->where('id', '<', (int) $cursor);
        }

        $messages = $query
            ->with(['senderMember.meProfile', 'media', 'reactions'])
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->sortBy('id')
            ->values();

        $nextCursor = $messages->first()?->id ?? null;
        $chatPayload = ChatMessageResource::collection($messages)->resolve();
        $chatItems = is_array($chatPayload) && array_key_exists('data', $chatPayload)
            ? $chatPayload['data']
            : $chatPayload;

        $combined = array_merge($legacyItems, is_array($chatItems) ? $chatItems : []);
        usort($combined, static function ($a, $b): int {
            $left = is_array($a) ? ($a['createdAt'] ?? '') : '';
            $right = is_array($b) ? ($b['createdAt'] ?? '') : '';
            return strcmp((string) $left, (string) $right);
        });

        if (count($combined) > $limit) {
            $combined = array_slice($combined, -$limit);
        }

        return ApiResponse::success($combined, [
            'nextCursor' => $nextCursor,
        ]);
    }

    public function store(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $user = $this->resolveUser();
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $validator = Validator::make($request->all(), [
            'messageType' => ['nullable', 'in:text,stamp,media'],
            'type' => ['nullable', 'in:text,stamp,media'],
            'body' => ['nullable', 'string'],
            'stampId' => ['nullable', 'string', 'max:40'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,mp4', 'max:10240'],
            'file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,mp4', 'max:10240'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $body = isset($data['body']) ? trim((string) $data['body']) : '';
        $file = $request->file('image') ?? $request->file('file');
        $stampId = isset($data['stampId']) ? trim((string) $data['stampId']) : '';
        $messageType = $data['messageType'] ?? $data['type'] ?? null;

        if ($file) {
            $messageType = 'media';
        } elseif ($stampId !== '') {
            $messageType = 'stamp';
        } else {
            $messageType = $messageType ?? 'text';
        }

        if ($messageType === 'text' && $body === '') {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'body' => ['Message body is required.'],
            ], 422);
        }

        if ($messageType === 'stamp' && $stampId === '') {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'stampId' => ['Stamp ID is required.'],
            ], 422);
        }

        if ($messageType === 'media' && !$file) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', [
                'file' => ['Media file is required.'],
            ], 422);
        }

        $count = ChatMessage::query()
            ->where('sender_member_id', $member->id)
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        if (!PlanGate::canSendChat($user, $count)) {
            return ApiResponse::error(
                'plan_limit_chat_messages',
                'Freeプランのチャット上限（30件/月）に達しました。',
                PlanGate::chatLimitDetails($user, $count),
                403
            );
        }

        $message = ChatMessage::create([
            'circle_id' => $circle,
            'sender_member_id' => $member->id,
            'message_type' => $messageType,
            'body' => $body !== '' ? $body : null,
            'stamp_id' => $messageType === 'stamp' ? $stampId : null,
            'created_at' => now(),
        ]);

        if ($file) {
            $stored = $this->storeChatMedia($file);
            if (isset($stored['error'])) {
                return ApiResponse::error(
                    $stored['error']['code'] ?? 'MEDIA_UPLOAD_FAILED',
                    $stored['error']['message'] ?? 'Media upload failed.',
                    null,
                    422
                );
            }

            ChatMessageMedia::create([
                'chat_message_id' => $message->id,
                'type' => $stored['type'] ?? 'image',
                'path' => $stored['path'],
                'url' => $stored['url'],
                'width' => $stored['width'] ?? null,
                'height' => $stored['height'] ?? null,
                'size_bytes' => $stored['sizeBytes'] ?? null,
                'created_at' => now(),
            ]);
        }

        $message->load(['senderMember.meProfile', 'media', 'reactions']);

        Circle::query()
            ->where('id', $circle)
            ->update(['last_activity_at' => now()]);

        OperationLogService::log($request, 'chat_message.create', $circle, [
            'hasMedia' => (bool) $file,
            'messageType' => $messageType,
        ]);

        return ApiResponse::success(new ChatMessageResource($message), null, 201);
    }

    public function read(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $validator = Validator::make($request->all(), [
            'lastReadAt' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $lastReadAt = $request->input('lastReadAt');
        $timestamp = $lastReadAt ? \Carbon\Carbon::parse($lastReadAt) : now();

        ChatRead::updateOrCreate(
            [
                'circle_id' => $circle,
                'circle_member_id' => $member->id,
            ],
            [
                'last_read_at' => $timestamp,
            ]
        );

        return ApiResponse::success(null);
    }

    public function destroy(Request $request, int $circle, int $message)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $chatMessage = ChatMessage::query()
            ->where('circle_id', $circle)
            ->where('id', $message)
            ->with('media')
            ->first();

        if (!$chatMessage) {
            return ApiResponse::error('NOT_FOUND', 'Chat message not found.', null, 404);
        }

        $isOwner = in_array($member->role, ['owner', 'admin'], true);
        if ($chatMessage->sender_member_id !== $member->id && !$isOwner) {
            return ApiResponse::error('FORBIDDEN', 'Only author or owner can delete.', null, 403);
        }

        foreach ($chatMessage->media as $media) {
            if ($media->path) {
                Storage::disk('public')->delete($media->path);
            }
        }

        $chatMessage->delete();

        OperationLogService::log($request, 'chat_message.delete', $circle, [
            'messageId' => $message,
        ]);

        return ApiResponse::success(null);
    }

    private function resolveMember(int $circleId, Request $request): ?CircleMember
    {
        $deviceId = $request->header('X-Device-Id');
        if ($deviceId) {
            $profile = MeProfileResolver::resolve($deviceId);
            if ($profile) {
                $member = CircleMember::query()
                    ->where('circle_id', $circleId)
                    ->where('me_profile_id', $profile->id)
                    ->first();
                if ($member) {
                    return $member;
                }
            }
        }

        return CircleMember::query()
            ->where('circle_id', $circleId)
            ->where('user_id', CurrentUser::id())
            ->first();
    }

    private function resolveUser(): ?User
    {
        return User::query()->find(CurrentUser::id());
    }

    private function storeChatMedia(\Illuminate\Http\UploadedFile $file): array
    {
        $mime = $file->getMimeType() ?? '';
        if (str_starts_with($mime, 'video/')) {
            $directory = 'chat';
            Storage::disk('public')->makeDirectory($directory);
            $extension = $file->getClientOriginalExtension() ?: 'mp4';
            $filename = \Illuminate\Support\Str::uuid()->toString() . '.' . $extension;
            $path = $file->storeAs($directory, $filename, 'public');
            $url = '/storage/' . ltrim($path, '/');

            return [
                'type' => 'video',
                'path' => $path,
                'url' => $url,
                'width' => null,
                'height' => null,
                'sizeBytes' => $file->getSize() ?: null,
            ];
        }

        return ImageUploadService::storePublicImage($file, 'chat');
    }
}
