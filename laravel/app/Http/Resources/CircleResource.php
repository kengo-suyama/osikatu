<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CircleResource extends JsonResource
{

    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'oshiLabel' => $this->oshi_label,
            'oshiTag' => $this->oshi_tag,
            'oshiTags' => $this->oshi_tags ?? [],
            'isPublic' => (bool) $this->is_public,
            'joinPolicy' => $this->join_policy ?? 'request',
            'iconUrl' => $this->icon_path ? Storage::disk('public')->url($this->icon_path) : null,
            'maxMembers' => $this->max_members ?? 30,
            'memberCount' => $this->members_count ?? null,
            'planRequired' => $this->plan_required ?? 'free',
            'lastActivityAt' => $this->last_activity_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
