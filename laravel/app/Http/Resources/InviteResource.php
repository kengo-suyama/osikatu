<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class InviteResource extends JsonResource
{
    public function toArray($request): array
    {
        $inviteUrl = null;
        if ($this->type === 'link' && !empty($this->token)) {
            $inviteUrl = url("/join?token={$this->token}");
        }

        return [
            'id' => $this->id,
            'circleId' => $this->circle_id ?? null,
            'type' => $this->type,
            'code' => $this->code ?? null,
            'inviteUrl' => $inviteUrl,
            'expiresAt' => $this->expires_at?->toIso8601String(),
            'maxUses' => $this->max_uses ?? null,
            'usedCount' => (int) ($this->used_count ?? 0),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
