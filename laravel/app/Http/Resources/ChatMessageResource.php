<?php

declare(strict_types=1);

namespace App\Http\Resources;

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
        $user = $profile?->user ?? null;
        $authorId = $member?->id ?? 0;
        $authorName = $profile?->nickname ?? 'Member';
        $avatarUrl = $profile?->avatar_url ?? null;
        $currentTitleId = $user?->current_title_id ?? null;

        return [
            'id' => 'cm_' . $this->id,
            'source' => 'chat',
            'circleId' => $this->circle_id,
            'user' => [
                'id' => $authorId,
                'name' => $authorName,
                'avatarUrl' => $avatarUrl,
                'currentTitleId' => $currentTitleId,
            ],
            'author' => [
                'id' => $authorId,
                'name' => $authorName,
                'avatarUrl' => $avatarUrl,
                'currentTitleId' => $currentTitleId,
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
        ];
    }
}
