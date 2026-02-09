<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CircleResource extends JsonResource
{
    private function resolvePublicUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        return '/storage/' . ltrim($path, '/');
    }

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
            'approvalRequired' => ($this->join_policy ?? 'request') !== 'instant',
            'iconUrl' => $this->resolvePublicUrl($this->icon_path ?? null),
            'maxMembers' => $this->max_members ?? 30,
            'memberCount' => $this->members_count ?? null,
            'planRequired' => $this->plan_required ?? 'free',
            'lastActivityAt' => $this->last_activity_at?->toIso8601String(),
            'myRole' => $this->my_role ?? null,
            'ui' => [
                'circleThemeId' => $this->uiSetting?->circle_theme_id,
                'specialBgEnabled' => (bool) ($this->uiSetting?->special_bg_enabled ?? false),
                'specialBgVariant' => $this->uiSetting?->special_bg_variant,
            ],
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
