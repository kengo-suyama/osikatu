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

## Phase6 Runbook: deny を本番でON/OFFする手順（コピペ用）

### (A) 事前確認（観測準備）

deny を入れる前に、v1 write がまだ来ていないか確認する。

1. ログ検索（Laravel log / 集約基盤）:

```bash
# storage/logs で直接検索（Laragon/ローカル）
grep "pins_v1_write_called" storage/logs/laravel.log | tail -50

# request_id で相関する場合（RequestIdMiddleware 導入済み）
grep "pins_v1_write_called" storage/logs/laravel.log | grep '"result":"allow"'
```

2. 確認ポイント:
   - 直近 7 日で `result=allow` がゼロか？
   - ゼロでないなら: `request_id` と `actor_user_id` で呼び出し元を特定
   - `endpoint` カラムで `POST /api/circles/{circle}/pins` 等の内訳を確認

3. 影響範囲:
   - **影響あり**: v1 write（`POST/PATCH /api/circles/{circle}/pins`, `POST .../unpin`）
   - **影響なし**: read（`GET /api/circles/{circle}/pins`）、`pins-v2` write すべて

### (B) delegate → deny に切り替え

```bash
# 0. 現在の状態を確認
php artisan pins:v1-status

# 1. 環境変数を変更（.env または環境変数管理）
PINS_V1_WRITE_MODE=deny

# 2. config cache を更新（これをしないと反映されない）
php artisan config:cache

# 3. 確認: 値が deny になっていること
php artisan tinker --execute="echo config('pins.v1_write_mode');"
# 出力: deny
```

### (C) 410 を受けた旧クライアントの挙動

deny が有効な状態で v1 write を叩くと:

```
HTTP/1.1 410 Gone
X-Osikatu-Deprecated: pins-v1
X-Osikatu-Use: /api/circles/{circle}/pins-v2
X-Request-Id: <uuid>
Content-Type: application/json

{"error":{"code":"PINS_V1_DEPRECATED","message":"..."}}}
```

- 正しく v2 に移行済みのクライアント: 影響なし（v1 write を叩かない）
- 未移行のクライアント: 410 エラーを受ける（ピン追加/編集/解除が失敗）
- `X-Osikatu-Use` ヘッダで移行先を案内

### (D) ロールバック（deny → delegate）

問題が出たら即座に戻す:

```bash
# 0. 現在の状態を確認
php artisan pins:v1-status

# 1. 環境変数を戻す
PINS_V1_WRITE_MODE=delegate

# 2. config cache を更新
php artisan config:cache

# 3. 確認
php artisan tinker --execute="echo config('pins.v1_write_mode');"
# 出力: delegate
```

ロールバック後の注意:
- v1 write が再び `result=allow` で通るようになる
- deny 中に失敗したリクエストの自動リトライは発生しない（クライアント側で再操作が必要）

### (E) 観測（deny 後の監視）

deny を有効にした後:

```bash
# deny で弾かれたリクエストを確認
grep "pins_v1_write_called" storage/logs/laravel.log | grep '"result":"deny"'

# request_id で特定のリクエストを追跡
grep "<request_id>" storage/logs/laravel.log
```

確認項目:
- `result=deny` / `http_status=410` が発生しているか
- 発生するなら `actor_user_id` / `request_id` で呼び出し元を特定
- 発生しなければ: 移行完了の証拠

### (F) 段階導入の例

1. **ステージング環境で先に deny**: 数日間 410 が出ないか確認
2. **本番で deny**: ロールバック手順を手元に置いて切り替え
3. **1週間監視**: `result=deny` がゼロであれば Phase7（410 固定）へ進む
4. **Phase7**: ルートの物理削除は、さらに数週間ゼロを確認してから

## Observability: pins-v1 write のログ schema（固定）

イベント名:
- `pins_v1_write_called`（structured log / `Log::info`）

固定キー:
- `circle_id`（number）
- `action`（string: `create|update|unpin`）
- `result`（string: `allow|deny|error`）
- `http_status`（number）
- `endpoint`（string: `METHOD path`）
- `actor_role`（string: `owner|admin|member|unknown`）

追加キー（安全なもの。必要なら使う）:
- `mode`（string: `delegate|deny`）
- `request_id`（string|null: `X-Request-Id` があれば）
- `actor_user_id`（number|null）

注意:
- 機密（トークン/本文/エラーメッセージ等）はログに出さない
