<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PostMediaResource extends JsonResource
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
            'type' => $this->type,
            'url' => $this->url ?? $this->resolvePublicUrl($this->path ?? null),
            'mime' => $this->mime ?? null,
            'width' => $this->width ?? null,
            'height' => $this->height ?? null,
        ];
    }
}
