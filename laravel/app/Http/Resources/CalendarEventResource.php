<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CalendarEventResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'circleId' => $this->circle_id ?? null,
            'type' => $this->type ?? null,
            'title' => $this->title ?? null,
            'startAt' => $this->start_at?->toIso8601String() ?? $this->start_datetime?->toIso8601String(),
            'endAt' => $this->end_at?->toIso8601String() ?? $this->end_datetime?->toIso8601String(),
            'importance' => $this->importance ?? 'med',
            'note' => $this->note ?? null,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
