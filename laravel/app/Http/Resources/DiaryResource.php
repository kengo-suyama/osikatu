<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class DiaryResource extends JsonResource
{
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
                        'url' => Storage::disk('public')->url($attachment->file_path),
                        'fileType' => $attachment->file_type,
                    ];
                })->values();
            }, []),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
