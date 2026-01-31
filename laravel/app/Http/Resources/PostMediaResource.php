<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PostMediaResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'url' => $this->url ?? ($this->path ? Storage::disk('public')->url($this->path) : null),
            'mime' => $this->mime ?? null,
            'width' => $this->width ?? null,
            'height' => $this->height ?? null,
        ];
    }
}
