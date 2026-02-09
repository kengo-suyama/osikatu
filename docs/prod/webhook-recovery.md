# Stripe Webhook 障害復旧 Runbook

> webhook が落ちた時に"復旧の手順"が 1 枚でできる。

## 1. 失敗パターン早見表

| パターン | ログキーワード | HTTP | 原因 | 対処 |
|----------|---------------|------|------|------|
| 署名NG | `billing_webhook_invalid_signature` | 400 | `STRIPE_WEBHOOK_SECRET` 不一致 or 期限切れ | §2.1 |
| 重複イベント | `billing_webhook_duplicate` | 200 | 同一 `stripe_event_id` が既処理 | 対処不要（冪等） |
| Queue 停止 | `billing_webhook_queued` のみ（`job_completed` なし） | — | Worker が落ちている | §2.2 |
| DB 接続エラー | `stripe_webhook_job_failed` + PDO/Connection | — | DB ダウン | §2.3 |
| Stripe 障害 | Stripe Dashboard に incidents | — | Stripe 側 | §2.4 |
| ユーザー紐付け失敗 | `stripe_subscription_user_not_found` | — | metadata 欠損 | §2.5 |

## 2. 復旧手順

### 2.1 署名検証エラー（`STRIPE_WEBHOOK_SECRET` 不一致）

```bash
# 1. ログで確認
grep "billing_webhook_invalid_signature" /var/log/osikatu/*.log | tail -20

# 2. Stripe Dashboard → Webhooks → endpoint → Signing secret を確認
# 3. .env を更新
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx

# 4. 反映
cd /srv/osikatu/laravel
php artisan config:cache

# 5. Stripe Dashboard → Webhooks → 失敗イベントを「Retry」
```

### 2.2 Queue Worker 停止

```bash
# 1. Worker 状態を確認
supervisorctl status osikatu-worker:*
# or (Docker)
docker compose -f docker-compose.prod.yml ps queue-worker

# 2. 未処理 Job を確認
cd /srv/osikatu/laravel
php artisan queue:monitor database:default

# 3. Worker 再起動
supervisorctl restart osikatu-worker:*
# or (Docker)
docker compose -f docker-compose.prod.yml restart queue-worker

# 4. 失敗 Job の再実行
php artisan queue:retry all
```

### 2.3 DB 接続エラー

```bash
# 1. DB 接続テスト
cd /srv/osikatu/laravel
php artisan tinker --execute "DB::select('SELECT 1')"

# 2. healthz で確認
curl -s https://osikatu.com/api/healthz | jq .

# 3. DB 復旧後、失敗 Job を再実行
php artisan queue:retry all
```

### 2.4 Stripe 側障害

```bash
# 1. Stripe Status 確認
# https://status.stripe.com/

# 2. Stripe が復旧したら Dashboard → Webhooks → 失敗イベントを確認
# 3. 必要に応じて手動 Retry（Stripe Dashboard から）
```

### 2.5 ユーザー紐付け失敗

```bash
# 1. ログからイベントを特定
grep "stripe_subscription_user_not_found" /var/log/osikatu/*.log | tail -10

# 2. Stripe Dashboard → Customers → metadata を確認
#    - user_id or device_id が設定されているか
#    - BillingSubscription テーブルに stripe_customer_id があるか

# 3. 手動修正（Tinker）
cd /srv/osikatu/laravel
php artisan tinker
# >>> App\Models\BillingSubscription::where('stripe_customer_id', 'cus_xxx')->first()
# >>> ... user_id を正しく紐付け
```

## 3. ログ検索ガイド

### 3.1 request_id で追跡

```bash
# 特定リクエストの全ログを追跡
grep "REQUEST_ID_HERE" /var/log/osikatu/*.log
```

### 3.2 stripe_event_id で追跡

```bash
# 特定の Stripe イベントの処理状況を確認
grep "evt_XXXXXXXXXXXXX" /var/log/osikatu/*.log
```

### 3.3 処理済みレシートの確認（DB）

```bash
cd /srv/osikatu/laravel
php artisan tinker --execute "
  App\Models\WebhookEventReceipt::where('stripe_event_id', 'evt_XXX')->first()
"
# status='processed' なら正常処理済み
```

### 3.4 構造化ログのキーワード一覧

| ログメッセージ | 段階 | 意味 |
|---------------|------|------|
| `billing_webhook_received` | 受信 | HTTP 受信成功 |
| `billing_webhook_invalid_signature` | 検証 | 署名NG |
| `billing_webhook_no_signature_verification` | 検証 | 開発環境（署名スキップ） |
| `billing_webhook_duplicate` | 冪等 | 既処理（安全にスキップ） |
| `billing_webhook_queued` | キュー | Job ディスパッチ成功 |
| `stripe_webhook_job_processing` | 処理 | Job 実行開始 |
| `stripe_webhook_job_completed` | 完了 | Job 正常完了 |
| `stripe_webhook_job_failed` | 失敗 | Job 失敗（リトライ最大3回） |

## 4. 安全な再処理の前提

- **冪等テーブル**: `webhook_event_receipts` に `stripe_event_id` が一意制約
- **同一イベント再送**: Stripe Dashboard から Retry → コントローラーが `duplicate` として 200 返却
- **新規として再処理したい場合**: receipt レコードを削除してから Retry

```bash
# ⚠️ 注意: 冪等性を解除する操作（確認の上実行）
cd /srv/osikatu/laravel
php artisan tinker --execute "
  App\Models\WebhookEventReceipt::where('stripe_event_id', 'evt_XXX')->delete()
"
# → Stripe Dashboard から Retry
```

## 5. 関連ドキュメント

- [Production Runbook](./runbook.md)
- [CI Strategy](../dev/ci-strategy.md)
