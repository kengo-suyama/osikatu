<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'oshi_id' => $this->oshi_id,
            'category' => $this->category,
            'amount' => $this->amount,
            'expense_date' => $this->expense_date?->toDateString(),
            'memo' => $this->memo,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
