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
            'user_id' => $this->user_id,
            'oshi_id' => $this->oshi_id,
            'title' => $this->title,
            'description' => $this->description,
            'start_datetime' => $this->start_datetime?->toISOString(),
            'end_datetime' => $this->end_datetime?->toISOString(),
            'notify_before_minutes' => $this->notify_before_minutes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
