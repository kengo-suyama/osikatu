<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DiaryResource extends JsonResource
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
            'userId' => $this->user_id,
            'oshiId' => $this->oshi_id,
            'title' => $this->title,
            'content' => $this->content,
            'diaryDate' => $this->diary_date?->toDateString(),
            'isLocked' => (bool) $this->is_locked,
            'tags' => $this->tags ?? [],
            'attachments' => $this->whenLoaded('attachments', function () {
                return $this->attachments->map(function ($attachment) {
                    return [
                        'id' => $attachment->id,
                        'url' => $this->resolvePublicUrl($attachment->file_path ?? null),
                        'fileType' => $attachment->file_type,
                    ];
                })->values();
            }, []),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
