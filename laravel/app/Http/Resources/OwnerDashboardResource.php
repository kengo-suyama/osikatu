<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class OwnerDashboardResource extends JsonResource
{
    public function toArray($request): array
    {
        $unconfirmed = $this['unconfirmedMembers'] ?? [];
        $unconfirmedMapped = array_map(
            fn ($item) => (new MemberBriefResource($item))->toArray($request),
            $unconfirmed
        );

        $unpaid = $this['unpaidMembers'] ?? [];
        $unpaidMapped = array_map(
            fn ($item) => [
                'member' => (new MemberBriefResource($item['member'] ?? []))->toArray($request),
                'amountYen' => (int) ($item['amountYen'] ?? 0),
            ],
            $unpaid
        );

        $rsvpPending = $this['rsvpPendingMembers'] ?? [];
        $rsvpPendingMapped = array_map(
            fn ($item) => (new MemberBriefResource($item))->toArray($request),
            $rsvpPending
        );

        $pinnedPost = $this['pinnedPost'] ?? null;
        if ($pinnedPost instanceof JsonResource) {
            $pinnedPost = $pinnedPost->resolve($request);
        }

        $joinRequests = $this['joinRequests'] ?? [];
        $joinRequestsMapped = array_map(
            fn ($item) => [
                'id' => $item['id'] ?? null,
                'member' => (new MemberBriefResource($item['member'] ?? []))->toArray($request),
                'message' => $item['message'] ?? null,
                'status' => $item['status'] ?? null,
                'requestedAt' => $item['requestedAt'] ?? null,
            ],
            $joinRequests
        );

        $payload = [
            'circleId' => $this['circleId'] ?? null,
            'myRole' => $this['myRole'] ?? null,
            'nextDeadline' => $this['nextDeadline'] ?? null,
            'counts' => $this['counts'] ?? [
                'unconfirmed' => 0,
                'unpaid' => 0,
                'rsvpPending' => 0,
            ],
            'unconfirmedMembers' => $unconfirmedMapped,
            'unpaidMembers' => $unpaidMapped,
            'rsvpPendingMembers' => $rsvpPendingMapped,
            'joinRequests' => $joinRequestsMapped,
        ];

        if ($pinnedPost !== null) {
            $payload['pinnedPost'] = $pinnedPost;
        }

        return $payload;
    }
}
