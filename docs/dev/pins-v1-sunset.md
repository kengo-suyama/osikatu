# Pins v1 Write Sunset Plan

目的:
- `pins-v1` write（`POST/PATCH /api/circles/{circle}/pins` と `POST .../unpin`）を、事故らずに段階的に停止できるようにする
- 互換維持しつつ「観測 → 警告 → ソフト停止 → 削除」を進める

現状:
- Read: `GET /api/circles/{circle}/pins` は `circle_pins` を読む（UI もこの read-path）
- Write: `pins-v2` が推奨（`circle_pins` を主に更新）
- `pins-v1` write は互換のため残存（deprecated header 付与、内部は Service に委譲）

## Sunset Stages（Phase5 -> Phase7）

### Phase5: 観測 + 警告強化
- deprecated header は継続:
  - `X-Osikatu-Deprecated: pins-v1`
  - `X-Osikatu-Use: /api/circles/{circle}/pins-v2`
- `pins-v1` write が呼ばれた事実を必ず残す（structured log または OperationLog）
- 新規実装は `pins-v2` に統一（フロント/運用/サンプル）

### Phase6: ソフト停止（deny スイッチで 410）
- `pins-v1` write を環境設定で拒否できるようにする
- deny 時:
  - HTTP: 410 Gone（推奨）
  - Body: error envelope（code は `PINS_V1_DEPRECATED`）
  - deprecated header/Use header は維持

### Phase7: ルート削除 or 410 固定
- ルート削除は影響が大きいので、まずは 410 固定で安全に運用できる状態を作る
- 外部クライアントが残っていないことを観測で確認できたら削除を検討

## 停止判断の材料

- `pins-v1` write の実使用率:
  - 直近 N 日で `pins_v1_write_called` がゼロか
  - deny を段階的に導入しても問題が出ないか
- 外部クライアントの残存:
  - 古い PWA/モバイル/バッチが `pins-v1` を叩いていないか
  - 叩いている場合は移行案内の導線があるか

## posts 側の扱い（結論）

案1（互換重視）:
- `posts.is_pinned` は当面残す（legacy/互換）
- `circle_pins` を主ストアとし、pins 表示は `GET /pins` を唯一の read-path に寄せる

案2（クリーン重視）:
- `pins-v2` write は posts を作らない/更新しない方向へ寄せる
- ただし影響範囲が広いので、段階移行の設計と追加テストが必須

結論（Phase5-7）:
- まず案1で進める（互換を維持しつつ、`pins-v1` write を止められる状態を作る）
- `pins-v1` の使用がゼロになり、運用上問題が出ないことを確認してから案2検討に進む

## このPhaseでやらないこと

- `pins-v1` ルートの即削除
- `posts.is_pinned` の強制的な廃止
- 既存 UI の read-path 変更（現状維持）

