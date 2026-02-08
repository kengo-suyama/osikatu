<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CirclePinResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'circleId' => $this->circle_id ?? null,
            'createdByMemberId' => $this->created_by_member_id ?? null,
            'title' => $this->title ?? '',
            'url' => $this->url ?? null,
            'body' => $this->body ?? '',
            'checklistJson' => $this->checklist_json ?? null,
            'sortOrder' => $this->sort_order ?? null,
            'pinnedAt' => $this->pinned_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
            'sourcePostId' => $this->source_post_id ?? null,
        ];
    }
}

