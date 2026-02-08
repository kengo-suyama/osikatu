<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CirclePin;
use App\Models\CircleMember;
use App\Models\Post;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CurrentUser;
use App\Support\PlanGate;
use Illuminate\Http\JsonResponse;

class PinWriteService
{
    private const PIN_LIMIT_FREE = 3;
    private const PIN_LIMIT_MANAGER_PLUS = 10;

    public function ensureCanManagePins(CircleMember $member): ?JsonResponse
    {
        $role = (string) ($member->role ?? 'member');
        if (!in_array($role, ['owner', 'admin'], true)) {
            return ApiResponse::error('FORBIDDEN', 'Not permitted.', null, 403);
        }
        return null;
    }

    public function pinLimitFor(User $user, CircleMember $member): int
    {
        $role = (string) ($member->role ?? 'member');
        if (PlanGate::hasPlus($user) && in_array($role, ['owner', 'admin'], true)) {
            return self::PIN_LIMIT_MANAGER_PLUS;
        }
        return self::PIN_LIMIT_FREE;
    }

    public function ensurePinLimit(int $circleId, int $maxPins): ?JsonResponse
    {
        $postCount = Post::query()
            ->where('circle_id', $circleId)
            ->where('is_pinned', true)
            ->count();

        $pinCount = CirclePin::query()
            ->where('circle_id', $circleId)
            ->count();

        // Use the larger count to avoid undercount during migration/backfill or if projection lags.
        $count = max((int) $postCount, (int) $pinCount);

        if ($count >= $maxPins) {
            return ApiResponse::error('PIN_LIMIT_EXCEEDED', 'ピンの上限に達しています', [
                'limit' => $maxPins,
                'current' => $count,
            ], 422);
        }

        return null;
    }

    public function createPinnedPost(
        int $circleId,
        CircleMember $member,
        string $body,
        array $tags = [],
        ?string $pinKind = null,
        mixed $pinDueAt = null,
    ): Post {
        return Post::create([
            'circle_id' => $circleId,
            'author_member_id' => $member->id,
            'user_id' => CurrentUser::id(),
            'post_type' => 'post',
            'body' => $body,
            'tags' => $tags,
            'is_pinned' => true,
            'pin_kind' => $pinKind,
            'pin_due_at' => $pinDueAt,
            'like_count' => 0,
        ]);
    }

    public function updatePinnedPost(
        Post $post,
        string $body,
        ?array $tags = null,
        ?string $pinKind = null,
        mixed $pinDueAt = null,
    ): void {
        $post->update([
            'body' => $body,
            'tags' => $tags ?? $post->tags ?? [],
            'pin_kind' => $pinKind ?? $post->pin_kind,
            'pin_due_at' => $pinDueAt ?? $post->pin_due_at,
            'is_pinned' => true,
        ]);
    }

    public function unpinPost(Post $post): void
    {
        $post->update(['is_pinned' => false]);
        CirclePin::query()
            ->where('source_post_id', $post->id)
            ->delete();
    }

    public function projectFromPost(Post $post, CircleMember $fallbackMember): CirclePin
    {
        $parsed = $this->extractTitleAndUrl((string) ($post->body ?? ''));

        return CirclePin::updateOrCreate(
            ['source_post_id' => $post->id],
            [
                'circle_id' => (int) $post->circle_id,
                'created_by_member_id' => (int) ($post->author_member_id ?? $fallbackMember->id),
                'title' => $parsed['title'],
                'url' => $parsed['url'],
                'body' => (string) ($post->body ?? ''),
                'pinned_at' => $post->created_at ?? now(),
            ]
        );
    }

    public function updateCirclePinBody(CirclePin $pin, int $circleId, string $body): CirclePin
    {
        $parsed = $this->extractTitleAndUrl($body);

        $pin->update([
            'body' => $body,
            'title' => $parsed['title'],
            'url' => $parsed['url'],
        ]);

        if ($pin->source_post_id) {
            Post::query()
                ->where('id', $pin->source_post_id)
                ->where('circle_id', $circleId)
                ->update([
                    'body' => $body,
                    'is_pinned' => true,
                ]);
        }

        return $pin->fresh();
    }

    public function unpinCirclePin(CirclePin $pin, int $circleId): void
    {
        $sourcePostId = $pin->source_post_id;
        $pin->delete();

        if ($sourcePostId) {
            Post::query()
                ->where('id', $sourcePostId)
                ->where('circle_id', $circleId)
                ->update(['is_pinned' => false]);
        }
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
                    $url = $this->substrSafe($candidate, 0, 2048);
                }
                break;
            }
        }

        return [
            'title' => $this->substrSafe($title, 0, 120),
            'url' => $url,
        ];
    }

    private function substrSafe(string $value, int $start, int $len): string
    {
        if (function_exists('mb_substr')) {
            return (string) mb_substr($value, $start, $len);
        }
        return substr($value, $start, $len);
    }
}

