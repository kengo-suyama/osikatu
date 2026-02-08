# Pins Migration Notes (Phase2 -> Phase3)

目的:
- Pins を `circle_pins` を主ストアとして扱う
- 互換性を壊さず段階移行する（v1 endpoints も当面維持）

## Phase2 (完了)

- DB: `circle_pins` 追加
- Read path:
  - `GET /api/circles/{circle}/pins` は `circle_pins` を返す
  - UI（Hub + /pins）はこの endpoint を参照
- Write path:
  - v1 pins API（postsベース）で CRUD し、`circle_pins` へ投影
- Backfill:
  - `php artisan app:backfill-circle-pins`（`posts.is_pinned=true` -> `circle_pins`）
  - デプロイ後に1回実行が必要: `docs/dev/pins-deploy-runbook.md`

## Phase3 (完了)

- Write path を `pins-v2` に切替（`circle_pins` を主に更新）
  - `POST  /api/circles/{circle}/pins-v2`
  - `PATCH /api/circles/{circle}/pins-v2/{pin}`
  - `POST  /api/circles/{circle}/pins-v2/{pin}/unpin`
- pin limit:
  - role `owner/admin` は write 可能
  - 上限は `free=3`, `plus(owner/admin)=10`（APIで強制）

## 並び順（確定）

`GET /api/circles/{circle}/pins` の並び:
1) `sortOrder`（降順、`null` は最後）— 新しいピンが上
2) `pinnedAt`（降順）
3) `id`（降順）

UI 側はAPIの順序を尊重する（クライアント側で再ソートしない）。

v2 create 時に `sort_order = max(sort_order) + 1` を自動採番する。
既存の null 行は `BackfillCirclePins::backfillSortOrder()` で埋める（idempotent）。

## チェックリスト（暫定）

Phase1/2 の本文フォーマットを継続:
- `- [ ] item`
- `- [x] item`

Phase3 の UI はクリックで on/off をトグルし、本文を書き換えて保存する（構造化は将来）。

## 旧経路（v1 pins API / posts.is_pinned）について

当面は後方互換のため残す。

Sunset 方針:
- `docs/dev/pins-v1-sunset.md`

将来のcleanup候補:
- v1 pins API は deprecated（互換維持のため当面残す）
  - レスポンスヘッダ:
    - `X-Osikatu-Deprecated: pins-v1`
    - `X-Osikatu-Use: /api/circles/{circle}/pins-v2`
  - 内部実装は `PinWriteService` に委譲し、v1/v2でロジックが二重実装にならないようにする（Phase4）
- `posts.is_pinned` 依存の縮退（移行完了後に段階削除）
