# Production Deploy One-pager v2

> これ1枚で他人が運用できる。完全版。

## 0. 前提環境

| 項目 | 要件 |
|------|------|
| PHP | 8.2+ (cli + fpm) |
| Node.js | 20 LTS |
| DB | MySQL 8.0+ (Managed推奨) |
| Redis | 7.x (Queue/Cache) |
| Queue | `php artisan queue:work` (supervisor/systemd) |
| TLS | 外部LB or Nginx terminate |

## 1. 環境変数（必須チェックリスト）

```env
# App
APP_ENV=production
APP_KEY=base64:... (php artisan key:generate)
APP_URL=https://<domain>
APP_PUBLIC_URL=https://<domain>
APP_DEBUG=false

# DB
DB_CONNECTION=mysql
DB_HOST=<managed-db-host>
DB_PORT=3306
DB_DATABASE=osikatu
DB_USERNAME=osikatu_app
DB_PASSWORD=<secret>

# Queue/Cache
QUEUE_CONNECTION=redis
CACHE_STORE=redis
REDIS_HOST=<redis-host>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_PLUS=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Billing URLs (relative paths resolved from APP_PUBLIC_URL)
BILLING_SUCCESS_URL=/billing/complete
BILLING_CANCEL_URL=/pricing
BILLING_PORTAL_RETURN_URL=/settings/billing

# Email (production)
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=<secret>
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@osikatu.com
MAIL_FROM_NAME=Osikatu
```

## 2. デプロイ手順

### 2.1 初回セットアップ

```bash
git clone <repo> /srv/osikatu && cd /srv/osikatu

# Backend
cd laravel
composer install --no-dev --optimize-autoloader
cp .env.example .env  # 上記の必須変数を設定
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend
cd ../frontend
npm ci --production
npm run build

# Queue worker (supervisor)
# → docs/prod/runbook.md §3.3
```

### 2.2 通常デプロイ

```bash
cd /srv/osikatu && git pull origin main

# Backend
cd laravel
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan queue:restart

# Frontend
cd ../frontend
npm ci --production && npm run build
pm2 restart osikatu-frontend
```

### 2.3 Docker デプロイ

```bash
cd /srv/osikatu
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## 3. 検証チェックリスト

```bash
# 1) ヘルスチェック
curl -sf https://<domain>/api/healthz | jq .

# 2) Production readiness (全env検証)
curl -sf https://<domain>/api/health/ready | jq .
# → ok: true が必須

# 3) Status (DB/Queue/Cache/Stripe)
curl -sf https://<domain>/api/status | jq .

# 4) フロントエンド
curl -sf https://<domain>/ -o /dev/null -w '%{http_code}\n'
# → 200

# 5) Stripe webhook テスト
# Stripe CLI: stripe trigger checkout.session.completed
# Dashboard: Webhooks → Send test event

# 6) Email テスト
php artisan email:test admin@example.com
```

## 4. ロールバック

### 4.1 コード

```bash
cd /srv/osikatu
git revert HEAD --no-edit && git push origin main
# → デプロイ手順 2.2 を再実行
```

### 4.2 マイグレーション

```bash
cd /srv/osikatu/laravel
# 事前にバックアップ確認: docs/prod/backup-restore.md
php artisan migrate:rollback --step=1
```

### 4.3 緊急メンテナンス

```bash
php artisan down --secret="bypass-token"
# 復旧後:
php artisan up
```

## 5. 運用コマンド

| 操作 | コマンド |
|------|---------|
| Queue状態 | `supervisorctl status osikatu-worker:*` |
| 失敗Job再実行 | `php artisan queue:retry all` |
| Queue再起動 | `php artisan queue:restart` |
| Config反映 | `php artisan config:cache` |
| メンテON | `php artisan down --secret=xxx` |
| メンテOFF | `php artisan up` |
| Email テスト | `php artisan email:test <to>` |
| DB接続テスト | `php artisan tinker --execute "DB::select('SELECT 1');"'` |

## 6. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [runbook.md](./runbook.md) | 詳細デプロイ手順 |
| [db-runbook.md](./db-runbook.md) | DB接続/バックアップ |
| [backup-restore.md](./backup-restore.md) | バックアップ/復旧 |
| [migration-safety.md](./migration-safety.md) | マイグレーション安全手順 |
| [webhook-recovery.md](./webhook-recovery.md) | Webhook障害復旧 |
| [checkout-troubleshoot.md](./checkout-troubleshoot.md) | Checkout緊急対応 |
| [account-delete-policy.md](./account-delete-policy.md) | 退会ポリシー |
| [nginx-reverse-proxy.md](./nginx-reverse-proxy.md) | Nginx設定 |
| [query-audit.md](./query-audit.md) | クエリ性能監査 |
| [ci-required-checks.md](../dev/ci-required-checks.md) | CI必須チェック |
