<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class GoodResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'oshi_id' => $this->oshi_id,
            'name' => $this->name,
            'category' => $this->category,
            'purchase_date' => $this->purchase_date?->toDateString(),
            'price' => $this->price,
            'image_path' => $this->image_path,
            'memo' => $this->memo,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
