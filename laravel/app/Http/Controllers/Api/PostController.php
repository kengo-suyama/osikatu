<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\Circle;
use App\Models\CircleMember;
use App\Models\Post;
use App\Models\PostAck;
use App\Models\PostLike;
use App\Models\PostMedia;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use App\Support\PlanGate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PostController extends Controller
{
    public function index(int $circle)
    {
        $member = $this->resolveMember($circle, request());
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $type = request()->query('type');
        $query = Post::query()
            ->where('circle_id', $circle);

        if (is_string($type) && $type !== '') {
            $query->where('post_type', $type);
        }

        $posts = $query
            ->with(['user', 'authorMember.meProfile', 'media'])
            ->withCount('likes')
            ->withCount('acks')
            ->withCount(['likes as liked_by_me' => function ($query): void {
                $query->where('user_id', CurrentUser::id());
            }])
            ->withCount(['acks as acked_by_me' => function ($query) use ($member): void {
                $query->where('circle_member_id', $member->id);
            }])
            ->when($type === 'chat', function ($builder): void {
                $builder->orderBy('id');
            }, function ($builder): void {
                $builder->orderByDesc('id');
            })
            ->get();

        return ApiResponse::success(PostResource::collection($posts));
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

        $limitError = $this->ensurePostLimit($user, $request);
        if ($limitError) {
            return $limitError;
        }

        $validator = Validator::make($request->all(), [
            'body' => ['required', 'string'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string'],
            'isPinned' => ['nullable', 'boolean'],
            'pinKind' => ['nullable', 'string'],
            'pinDueAt' => ['nullable', 'date'],
            'postType' => ['nullable', 'in:post,chat,system'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $postType = $data['postType'] ?? 'post';

        $chatLimitError = $this->ensureChatLimit($user, $postType);
        if ($chatLimitError) {
            return $chatLimitError;
        }

        $post = Post::create([
            'circle_id' => $circle,
            'author_member_id' => $member->id,
            'user_id' => CurrentUser::id(),
            'post_type' => $postType,
            'body' => $data['body'],
            'tags' => $data['tags'] ?? [],
            'is_pinned' => $data['isPinned'] ?? false,
            'pin_kind' => $data['pinKind'] ?? null,
            'pin_due_at' => $data['pinDueAt'] ?? null,
            'like_count' => 0,
        ]);

        $post->load(['user', 'authorMember.meProfile', 'media']);
        $post->loadCount('likes');
        $post->loadCount('acks');
        $post->liked_by_me = 0;
        $post->acked_by_me = 0;

        Circle::query()
            ->where('id', $circle)
            ->update(['last_activity_at' => now()]);

        return ApiResponse::success(new PostResource($post), null, 201);
    }

    public function storeMedia(Request $request, int $post)
    {
        $postModel = Post::query()
            ->where('id', $post)
            ->first();

        if (!$postModel) {
            return ApiResponse::error('NOT_FOUND', 'Post not found.', null, 404);
        }

        $member = $this->resolveMember($postModel->circle_id, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $user = $this->resolveUser();
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $limitError = $this->ensureImageLimit($user);
        if ($limitError) {
            return $limitError;
        }

        $validator = Validator::make($request->all(), [
            'image' => ['nullable', 'image', 'max:5120'],
            'file' => ['nullable', 'file', 'max:5120'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $file = $request->file('image') ?? $request->file('file');
        if (!$file) {
            return ApiResponse::error('VALIDATION_ERROR', 'file is required', null, 422);
        }

        $path = $file->store('posts', 'public');
        $url = \Illuminate\Support\Facades\Storage::disk('public')->url($path);

        $media = PostMedia::create([
            'post_id' => $postModel->id,
            'type' => 'image',
            'path' => $path,
            'url' => $url,
            'mime' => $file->getMimeType(),
            'sort' => 0,
        ]);

        $postModel->load(['user', 'authorMember.meProfile', 'media']);
        $postModel->loadCount('likes');
        $postModel->loadCount('acks');
        $postModel->liked_by_me = PostLike::query()
            ->where('post_id', $postModel->id)
            ->where('user_id', CurrentUser::id())
            ->exists() ? 1 : 0;
        $postModel->acked_by_me = PostAck::query()
            ->where('post_id', $postModel->id)
            ->where('circle_member_id', $member->id)
            ->exists() ? 1 : 0;

        Circle::query()
            ->where('id', $postModel->circle_id)
            ->update(['last_activity_at' => now()]);

        return ApiResponse::success(new PostResource($postModel), null, 201);
    }

    public function like(int $post)
    {
        $postModel = Post::query()->where('id', $post)->first();

        if (!$postModel) {
            return ApiResponse::error('NOT_FOUND', 'Post not found.', null, 404);
        }

        $member = $this->resolveMember($postModel->circle_id, request());
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        PostLike::firstOrCreate([
            'post_id' => $postModel->id,
            'user_id' => CurrentUser::id(),
        ]);

        $likeCount = PostLike::query()->where('post_id', $postModel->id)->count();
        $postModel->update(['like_count' => $likeCount]);

        return ApiResponse::success(null);
    }

    public function unlike(int $post)
    {
        $postModel = Post::query()->where('id', $post)->first();

        if (!$postModel) {
            return ApiResponse::error('NOT_FOUND', 'Post not found.', null, 404);
        }

        $member = $this->resolveMember($postModel->circle_id, request());
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        PostLike::query()
            ->where('post_id', $postModel->id)
            ->where('user_id', CurrentUser::id())
            ->delete();

        $likeCount = PostLike::query()->where('post_id', $postModel->id)->count();
        $postModel->update(['like_count' => $likeCount]);

        return ApiResponse::success(null);
    }

    public function ack(Request $request, int $post)
    {
        $postModel = Post::query()->where('id', $post)->first();

        if (!$postModel) {
            return ApiResponse::error('NOT_FOUND', 'Post not found.', null, 404);
        }

        $member = $this->resolveMember($postModel->circle_id, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        PostAck::firstOrCreate(
            ['post_id' => $postModel->id, 'circle_member_id' => $member->id],
            ['acked_at' => now()]
        );

        $postModel->load(['user', 'authorMember.meProfile', 'media']);
        $postModel->loadCount('likes');
        $postModel->loadCount('acks');
        $postModel->liked_by_me = PostLike::query()
            ->where('post_id', $postModel->id)
            ->where('user_id', CurrentUser::id())
            ->exists() ? 1 : 0;
        $postModel->acked_by_me = 1;

        return ApiResponse::success(new PostResource($postModel));
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

    private function ensurePostLimit(User $user, Request $request): ?\Illuminate\Http\JsonResponse
    {
        if (PlanGate::hasPremium($user)) {
            return null;
        }

        $postType = $request->input('postType', 'post');
        if ($postType !== 'post') {
            return null;
        }

        $count = Post::query()
            ->where('user_id', $user->id)
            ->where('post_type', 'post')
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        if ($count >= 3) {
            return ApiResponse::error('PLAN_LIMIT', 'Free plan allows only 3 posts per month.', [
                'limit' => 3,
                'current' => $count,
            ], 403);
        }

        return null;
    }

    private function ensureChatLimit(User $user, string $postType): ?\Illuminate\Http\JsonResponse
    {
        if ($postType !== 'chat') {
            return null;
        }

        if (PlanGate::hasPremium($user)) {
            return null;
        }

        $count = Post::query()
            ->where('user_id', $user->id)
            ->where('post_type', 'chat')
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        if ($count >= 30) {
            return ApiResponse::error(
                'plan_limit_chat_messages',
                'Freeプランのチャット上限（30件/月）に達しました。',
                [
                    'limit' => 30,
                    'current' => $count,
                ],
                403
            );
        }

        return null;
    }

    private function ensureImageLimit(User $user): ?\Illuminate\Http\JsonResponse
    {
        $limit = PlanGate::hasPremium($user) ? 300 : 5;

        $count = PostMedia::query()
            ->whereHas('post', function ($query) use ($user): void {
                $query->where('user_id', $user->id);
            })
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        if ($count >= $limit) {
            return ApiResponse::error('PLAN_LIMIT', 'Image upload limit reached for this plan.', [
                'limit' => $limit,
                'current' => $count,
            ], 403);
        }

        return null;
    }
}
