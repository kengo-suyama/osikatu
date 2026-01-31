<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ScheduleResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'oshiId' => $this->oshi_id,
            'title' => $this->title,
            'description' => $this->description,
            'startDatetime' => $this->start_datetime?->toIso8601String(),
            'endDatetime' => $this->end_datetime?->toIso8601String(),
            'notifyBeforeMinutes' => $this->notify_before_minutes,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
