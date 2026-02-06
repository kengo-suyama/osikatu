<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DiaryResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'oshi_id' => $this->oshi_id,
            'title' => $this->title,
            'content' => $this->content,
            'diary_date' => $this->diary_date?->toDateString(),
            'is_locked' => (bool) $this->is_locked,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
