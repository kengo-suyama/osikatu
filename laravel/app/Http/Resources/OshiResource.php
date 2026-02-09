<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class OshiResource extends JsonResource
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

    private function resolveImageUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        // Return relative URL so the frontend can proxy `/storage/*` via Next rewrites
        return '/storage/' . ltrim($path, '/');
    }

    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category ?? null,
            'isPrimary' => (bool) ($this->is_primary ?? false),
            'nickname' => $this->nickname ?? null,
            'birthday' => $this->birthday ?? null,
            'heightCm' => $this->height_cm ?? null,
            'weightKg' => $this->weight_kg ?? null,
            'bloodType' => $this->blood_type ?? null,
            'accentColor' => $this->accent_color ?? $this->color ?? null,
            'origin' => $this->origin ?? null,
            'role' => $this->role ?? null,
            'charmPoint' => $this->charm_point ?? null,
            'quote' => $this->quote ?? null,
            'hobbies' => $this->ensureArray($this->hobbies ?? null),
            'likes' => $this->ensureArray($this->likes ?? null),
            'dislikes' => $this->ensureArray($this->dislikes ?? null),
            'skills' => $this->ensureArray($this->skills ?? null),
            'favoriteFoods' => $this->ensureArray($this->favorite_foods ?? null),
            'weakPoints' => $this->ensureArray($this->weak_points ?? null),
            'supplyTags' => $this->ensureArray($this->supply_tags ?? null),
            'anniversaries' => $this->ensureArray($this->anniversaries ?? null),
            'links' => $this->ensureArray($this->links ?? null),
            'customFields' => $this->ensureArray($this->custom_fields ?? null),
            'memo' => $this->memo ?? null,
            'imageUrl' => $this->image_url ?? $this->resolveImageUrl($this->image_path ?? null),
            'imageFrameId' => $this->image_frame_id ?? null,
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
