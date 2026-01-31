<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    private function ensureArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    public function toArray($request): array
    {
        $authorMember = $this->authorMember ?? null;
        $profile = $authorMember?->meProfile ?? null;
        $authorId = $authorMember?->id ?? $this->user_id ?? null;
        $authorName = $profile?->nickname ?? $this->user?->name ?? 'You';
        $avatarUrl = $profile?->avatar_url ?? null;

        return [
            'id' => $this->id,
            'circleId' => $this->circle_id ?? null,
            'author' => [
                'id' => $authorId,
                'name' => $authorName,
                'avatarUrl' => $avatarUrl,
            ],
            'postType' => $this->post_type ?? 'post',
            'body' => $this->body ?? '',
            'tags' => $this->ensureArray($this->tags ?? null),
            'media' => PostMediaResource::collection($this->whenLoaded('media')),
            'likeCount' => (int) ($this->like_count ?? $this->likes_count ?? 0),
            'likedByMe' => (bool) ($this->liked_by_me ?? false),
            'isPinned' => (bool) ($this->is_pinned ?? false),
            'pinKind' => $this->pin_kind ?? null,
            'pinDueAt' => $this->pin_due_at?->toIso8601String(),
            'ackCount' => isset($this->acks_count) ? (int) $this->acks_count : null,
            'ackedByMe' => isset($this->acked_by_me) ? (bool) $this->acked_by_me : null,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
