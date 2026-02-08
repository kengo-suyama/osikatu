# Operation Log

## Overview

`OperationLog` records significant user actions for audit and observability.
Each log entry is correlated with a request via `request_id` (UUID).

## Request ID

Every API request receives a unique `X-Request-Id` header (UUID v4).
The middleware (`RequestIdMiddleware`) sets it on both request and response.

- If the client sends `X-Request-Id`, it is reused.
- Otherwise, a new UUID is generated.
- The request ID is injected into `Log::withContext` for structured logging.
- `OperationLogService::log()` automatically includes `request_id` in meta.

## Meta Policy

Each action defines which meta keys are allowed. Keys not in the allowed list are silently dropped.

### Global Keys (available to all actions)

`enabled`, `specialBg`, `mediaCount`, `frameId`, `themeId`, `inviteCount`,
`role`, `plan`, `source`, `reasonCode`, `hasImage`, `messageId`, `mode`, `request_id`

### Action-Specific Keys

| Action | Allowed Keys |
|--------|-------------|
| `chat_message.create` | hasImage, mediaCount |
| `chat_message.delete` | messageId, mediaCount |
| `join_request.create` | mode, reasonCode |
| `join_request.approve` | mode, reasonCode |
| `join_request.reject` | reasonCode |
| `oshi_media.change_frame` | frameId |
| `circle.ui.theme.update` | themeId |
| `circle.ui.special_bg.update` | enabled, specialBg |
| `settlement.create` | circleId, settlementId, amountInt, participantCount, transferCount, splitMode |
| `settlement.update` | circleId, settlementId, transferCount |
| `proposal.approve` | proposalId, result, request_id |
| `proposal.reject` | proposalId, result, request_id |

### Validation Rules

- **Forbidden keys**: message, body, text, content, title, url, name, email, ip, etc.
- **String max lengths**: role=32, plan=16, source=32, reasonCode=32, splitMode=16, request_id=36, default=64
- **URL-like strings**: blocked (http://, https://, ://, www.)
- **Arrays/Objects**: always blocked
- **Integers**: clamped to >= 0
- **Total meta size**: max 1024 bytes JSON

## Tracing a Request

1. Get `X-Request-Id` from API response header
2. Find the operation log: `OperationLog::where('meta->request_id', $requestId)->first()`
3. Correlate with Laravel logs: `grep $requestId storage/logs/laravel.log`
