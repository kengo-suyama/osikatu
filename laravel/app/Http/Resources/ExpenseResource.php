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
            'userId' => $this->user_id,
            'oshiId' => $this->oshi_id,
            'category' => $this->category,
            'amount' => (int) $this->amount,
            'expenseDate' => $this->expense_date?->toDateString(),
            'memo' => $this->memo,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
