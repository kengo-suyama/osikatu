<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CirclePinResource;
use App\Http\Resources\PostResource;
use App\Models\Circle;
use App\Models\CirclePin;
use App\Models\CircleMember;
use App\Models\Post;
use App\Models\PostAck;
use App\Models\PostLike;
use App\Models\PostMedia;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\ImageUploadService;
use App\Support\MeProfileResolver;
use App\Support\PlanGate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PostController extends Controller
{
    private const PIN_LIMIT_FREE = 3;
    private const PIN_LIMIT_MANAGER_PLUS = 10;

    public function storePinV2(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $user = $this->resolveUser();
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $pinError = $this->ensureCanManagePins($member, $user);
        if ($pinError) {
            return $pinError;
        }

        $validator = Validator::make($request->all(), [
            'body' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $maxPins = $this->pinLimitFor($user, $member);
        $limitError = $this->ensurePinLimitV2($circle, $maxPins);
        if ($limitError) {
            return $limitError;
        }

        $data = $validator->validated();

        // Compatibility: still create a pinned post (Phase1 behavior) and treat circle_pins as the primary store.
        $post = Post::create([
            'circle_id' => $circle,
            'author_member_id' => $member->id,
            'user_id' => CurrentUser::id(),
            'post_type' => 'post',
            'body' => $data['body'],
            'tags' => [],
            'is_pinned' => true,
            'pin_kind' => null,
            'pin_due_at' => null,
            'like_count' => 0,
        ]);

        Circle::query()
            ->where('id', $circle)
            ->update(['last_activity_at' => now()]);

        $this->upsertCirclePinFromPost($post, $member);

        $pin = CirclePin::query()->where('source_post_id', $post->id)->first();
        if (!$pin) {
            return ApiResponse::error('PIN_SYNC_FAILED', 'Pin sync failed.', null, 500);
        }

        return ApiResponse::success(new CirclePinResource($pin), null, 201);
    }

    public function updatePinV2(Request $request, int $circle, int $pin)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $user = $this->resolveUser();
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $pinError = $this->ensureCanManagePins($member, $user);
        if ($pinError) {
            return $pinError;
        }

        $model = CirclePin::query()
            ->where('id', $pin)
            ->where('circle_id', $circle)
            ->first();

        if (!$model) {
            return ApiResponse::error('NOT_FOUND', 'Pin not found.', null, 404);
        }

        $validator = Validator::make($request->all(), [
            'body' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $parsed = $this->extractTitleAndUrl((string) $data['body']);

        $model->update([
            'body' => (string) $data['body'],
            'title' => $parsed['title'],
            'url' => $parsed['url'],
        ]);

        if ($model->source_post_id) {
            Post::query()
                ->where('id', $model->source_post_id)
                ->where('circle_id', $circle)
                ->update([
                    'body' => (string) $data['body'],
                    'is_pinned' => true,
                ]);
        }

        return ApiResponse::success(new CirclePinResource($model->fresh()));
    }

    public function unpinPinV2(Request $request, int $circle, int $pin)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $user = $this->resolveUser();
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $pinError = $this->ensureCanManagePins($member, $user);
        if ($pinError) {
            return $pinError;
        }

        $model = CirclePin::query()
            ->where('id', $pin)
            ->where('circle_id', $circle)
            ->first();

        if (!$model) {
            return ApiResponse::error('NOT_FOUND', 'Pin not found.', null, 404);
        }

        $sourcePostId = $model->source_post_id;

        $model->delete();

        if ($sourcePostId) {
            Post::query()
                ->where('id', $sourcePostId)
                ->where('circle_id', $circle)
                ->update(['is_pinned' => false]);
        }

        return ApiResponse::success(['unpinned' => true]);
    }

    public function indexPins(int $circle)
    {
        $member = $this->resolveMember($circle, request());
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $pins = CirclePin::query()
            ->where('circle_id', $circle)
            // Lower sort_order = higher priority; nulls last.
            ->orderByRaw('sort_order is null')
            ->orderBy('sort_order')
            ->orderByDesc('pinned_at')
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success(CirclePinResource::collection($pins));
    }

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

        if (($data['isPinned'] ?? false) === true) {
            $pinError = $this->ensureCanManagePins($member, $user);
            if ($pinError) {
                return $pinError;
            }

            $maxPins = $this->pinLimitFor($user, $member);
            $limitError = $this->ensurePinLimit($circle, $maxPins);
            if ($limitError) {
                return $limitError;
            }
        }

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

        if (($post->is_pinned ?? false) === true) {
            $this->upsertCirclePinFromPost($post, $member);
        }

        return ApiResponse::success(new PostResource($post), null, 201);
    }

    public function storePin(Request $request, int $circle)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $user = $this->resolveUser();
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $pinError = $this->ensureCanManagePins($member, $user);
        if ($pinError) {
            return $pinError;
        }

        $validator = Validator::make($request->all(), [
            'body' => ['required', 'string'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string'],
            'pinKind' => ['nullable', 'string'],
            'pinDueAt' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $maxPins = $this->pinLimitFor($user, $member);
        $limitError = $this->ensurePinLimit($circle, $maxPins);
        if ($limitError) {
            return $limitError;
        }

        $data = $validator->validated();
        $post = Post::create([
            'circle_id' => $circle,
            'author_member_id' => $member->id,
            'user_id' => CurrentUser::id(),
            'post_type' => 'post',
            'body' => $data['body'],
            'tags' => $data['tags'] ?? [],
            'is_pinned' => true,
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

        $this->upsertCirclePinFromPost($post, $member);

        return ApiResponse::success(new PostResource($post), null, 201);
    }

    public function updatePin(Request $request, int $circle, int $post)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $user = $this->resolveUser();
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $pinError = $this->ensureCanManagePins($member, $user);
        if ($pinError) {
            return $pinError;
        }

        $postModel = Post::query()
            ->where('id', $post)
            ->where('circle_id', $circle)
            ->first();

        if (!$postModel || !$postModel->is_pinned) {
            return ApiResponse::error('NOT_FOUND', 'Pin not found.', null, 404);
        }

        $validator = Validator::make($request->all(), [
            'body' => ['required', 'string'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string'],
            'pinKind' => ['nullable', 'string'],
            'pinDueAt' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return ApiResponse::error('VALIDATION_ERROR', 'Validation failed', $validator->errors(), 422);
        }

        $data = $validator->validated();

        $postModel->update([
            'body' => $data['body'],
            'tags' => $data['tags'] ?? $postModel->tags ?? [],
            'pin_kind' => $data['pinKind'] ?? $postModel->pin_kind,
            'pin_due_at' => $data['pinDueAt'] ?? $postModel->pin_due_at,
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

        $this->upsertCirclePinFromPost($postModel, $member);

        return ApiResponse::success(new PostResource($postModel));
    }

    public function unpinPin(Request $request, int $circle, int $post)
    {
        $member = $this->resolveMember($circle, $request);
        if (!$member) {
            return ApiResponse::error('FORBIDDEN', 'Not a circle member.', null, 403);
        }

        $user = $this->resolveUser();
        if (!$user) {
            return ApiResponse::error('USER_NOT_FOUND', 'User not found.', null, 404);
        }

        $pinError = $this->ensureCanManagePins($member, $user);
        if ($pinError) {
            return $pinError;
        }

        $postModel = Post::query()
            ->where('id', $post)
            ->where('circle_id', $circle)
            ->first();

        if (!$postModel || !$postModel->is_pinned) {
            return ApiResponse::error('NOT_FOUND', 'Pin not found.', null, 404);
        }

        $postModel->update(['is_pinned' => false]);

        CirclePin::query()
            ->where('source_post_id', $postModel->id)
            ->delete();

        return ApiResponse::success(['unpinned' => true]);
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

        $stored = ImageUploadService::storePublicImage($file, 'posts');
        if (isset($stored['error'])) {
            return ApiResponse::error(
                $stored['error']['code'] ?? 'IMAGE_PROCESS_FAILED',
                $stored['error']['message'] ?? 'Image upload failed.',
                null,
                422
            );
        }

        $media = PostMedia::create([
            'post_id' => $postModel->id,
            'type' => 'image',
            'path' => $stored['path'],
            'url' => $stored['url'],
            'mime' => $file->getMimeType(),
            'width' => $stored['width'] ?? null,
            'height' => $stored['height'] ?? null,
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

    private function ensureCanManagePins(CircleMember $member, User $user): ?\Illuminate\Http\JsonResponse
    {
        $role = (string) ($member->role ?? 'member');
        if (!in_array($role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Not permitted.', null, 403);
        }

        // Note: pin limit differs by plan; permission is role-based.
        return null;
    }

    private function pinLimitFor(User $user, CircleMember $member): int
    {
        $role = (string) ($member->role ?? 'member');
        if (PlanGate::hasPlus($user) && in_array($role, ['owner', 'admin'], true)) {
            return self::PIN_LIMIT_MANAGER_PLUS;
        }
        return self::PIN_LIMIT_FREE;
    }

    private function ensurePinLimit(int $circleId, int $maxPins): ?\Illuminate\Http\JsonResponse
    {
        $count = Post::query()
            ->where('circle_id', $circleId)
            ->where('is_pinned', true)
            ->count();

        if ($count >= $maxPins) {
            return ApiResponse::error('PIN_LIMIT_EXCEEDED', 'ピンの上限に達しています', [
                'limit' => $maxPins,
                'current' => $count,
            ], 422);
        }

        return null;
    }

    private function ensurePinLimitV2(int $circleId, int $maxPins): ?\Illuminate\Http\JsonResponse
    {
        $postCount = Post::query()
            ->where('circle_id', $circleId)
            ->where('is_pinned', true)
            ->count();

        $pinCount = CirclePin::query()
            ->where('circle_id', $circleId)
            ->count();

        // Safety: avoid undercount while backfill is pending (use the larger count).
        $count = max((int) $postCount, (int) $pinCount);

        if ($count >= $maxPins) {
            return ApiResponse::error('PIN_LIMIT_EXCEEDED', 'ピンの上限に達しています', [
                'limit' => $maxPins,
                'current' => $count,
            ], 422);
        }

        return null;
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

        $count = Post::query()
            ->where('user_id', $user->id)
            ->where('post_type', 'chat')
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

    /**
     * Keep circle_pins in sync while Phase1 endpoints are still post-backed.
     *
     * This allows a later frontend switch (pinsRepo) without breaking existing UI/E2E today.
     */
    private function upsertCirclePinFromPost(Post $post, CircleMember $actorMember): void
    {
        if (($post->is_pinned ?? false) !== true) {
            return;
        }

        $parsed = $this->extractTitleAndUrl((string) ($post->body ?? ''));

        CirclePin::updateOrCreate(
            ['source_post_id' => $post->id],
            [
                'circle_id' => (int) $post->circle_id,
                'created_by_member_id' => (int) ($post->author_member_id ?? $actorMember->id),
                'title' => $parsed['title'],
                'url' => $parsed['url'],
                'body' => (string) ($post->body ?? ''),
                'pinned_at' => $post->created_at ?? now(),
            ]
        );
    }

    /**
     * @return array{title: string, url: ?string}
     */
    private function extractTitleAndUrl(string $body): array
    {
        $lines = preg_split("/\\r\\n|\\n|\\r/", $body) ?: [];
        $title = trim((string) ($lines[0] ?? ''));
        if ($title === '') {
            $title = '(無題)';
        }

        $url = null;
        foreach ($lines as $line) {
            if (!is_string($line)) {
                continue;
            }
            if (preg_match('/^\\s*URL:\\s*(\\S+)/i', $line, $m) === 1) {
                $candidate = trim((string) ($m[1] ?? ''));
                if ($candidate !== '') {
                    $url = $this->substrSafe($candidate, 2048);
                }
                break;
            }
        }

        return [
            'title' => $this->substrSafe($title, 120),
            'url' => $url,
        ];
    }

    private function substrSafe(string $value, int $maxLen): string
    {
        if (function_exists('mb_substr')) {
            return (string) mb_substr($value, 0, $maxLen);
        }
        return substr($value, 0, $maxLen);
    }
}
