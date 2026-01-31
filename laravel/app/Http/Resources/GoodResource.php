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
            'userId' => $this->user_id,
            'oshiId' => $this->oshi_id,
            'name' => $this->name,
            'category' => $this->category,
            'purchaseDate' => $this->purchase_date?->toDateString(),
            'price' => (int) $this->price,
            'imagePath' => $this->image_path,
            'memo' => $this->memo,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
