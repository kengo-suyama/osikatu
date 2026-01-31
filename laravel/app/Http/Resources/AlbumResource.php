<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AlbumResource extends JsonResource
{
    private function ensureArray(mixed $value): array
    {
        return is_array($value) ? $value : [];
    }

    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'circleId' => $this->circle_id ?? null,
            'title' => $this->title ?? null,
            'note' => $this->note ?? null,
            'media' => $this->ensureArray($this->media ?? null),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
