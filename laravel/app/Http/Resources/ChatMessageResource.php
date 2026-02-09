<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Support\CurrentUser;
use App\Support\MeProfileResolver;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatMessageResource extends JsonResource
{
    private function resolveImageUrl(): ?string
    {
        $media = $this->media;
        if (!$media) {
            return null;
        }
        $first = $media->first();
        return $first?->url ?? null;
    }

    public function toArray($request): array
    {
        $member = $this->senderMember ?? null;
        $profile = $member?->meProfile ?? null;
        $authorId = $member?->id ?? 0;
        $authorName = $profile?->nickname ?? 'Member';
        $avatarUrl = $profile?->avatar_url ?? null;

        return [
            'id' => 'cm_' . $this->id,
            'source' => 'chat',
            'circleId' => $this->circle_id,
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
            'body' => $this->body ?? '',
            'messageType' => $this->message_type ?? 'text',
            'stampId' => $this->stamp_id ?? null,
            'tags' => [],
            'media' => ChatMessageMediaResource::collection($this->whenLoaded('media')),
            'imageUrl' => $this->resolveImageUrl(),
            'likeCount' => 0,
            'likedByMe' => false,
            'isPinned' => false,
            'pinKind' => null,
            'pinDueAt' => null,
            'deletedAt' => null,
            'createdAt' => $this->created_at?->toIso8601String(),
            'reactions' => $this->buildReactions(),
        ];
    }

    private function buildReactions(): array
    {
        $reactions = $this->whenLoaded('reactions', function () {
            return $this->reactions;
        });

        if (!$reactions || $reactions instanceof \Illuminate\Database\Eloquent\MissingValue) {
            return ['counts' => (object) [], 'myReacted' => []];
        }

        $userId = $this->resolveCurrentUserId();
        $counts = [];
        $myReacted = [];

        foreach ($reactions as $reaction) {
            $emoji = $reaction->emoji;
            if (!isset($counts[$emoji])) {
                $counts[$emoji] = 0;
            }
            $counts[$emoji]++;
            if ($userId && $reaction->user_id === $userId) {
                $myReacted[] = $emoji;
            }
        }

        return [
            'counts' => empty($counts) ? (object) [] : $counts,
            'myReacted' => array_values(array_unique($myReacted)),
        ];
    }

    private function resolveCurrentUserId(): ?int
    {
        $deviceId = request()->header('X-Device-Id');
        if ($deviceId) {
            $profile = MeProfileResolver::resolve($deviceId);
            return $profile?->user_id;
        }
        return CurrentUser::id();
    }
}
