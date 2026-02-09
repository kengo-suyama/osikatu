# Production Runbook

> これだけ見ればデプロイできる。

## 1. 前提条件

| 項目 | 要件 |
|------|------|
| PHP | 8.2+ (cli + fpm) |
| Composer | 2.x |
| Node.js | 20 LTS |
| MySQL | 8.0+ |
| Redis | 7.x（キャッシュ・Queue） |
| Queue worker | `php artisan queue:work` (systemd / supervisor) |

## 2. 環境変数一覧

### 必須

| 変数名 | 用途 | 例 |
|--------|------|----|
| `APP_ENV` | 環境 | `production` |
| `APP_KEY` | 暗号鍵 | `base64:...` (`php artisan key:generate`) |
| `APP_URL` | サービスURL | `https://osikatu.com` |
| `APP_DEBUG` | デバッグ | `false` (本番は必ず false) |
| `DB_CONNECTION` | DB種別 | `mysql` |
| `DB_HOST` | DBホスト | `db.internal` |
| `DB_PORT` | DBポート | `3306` |
| `DB_DATABASE` | DB名 | `osikatu` |
| `DB_USERNAME` | DBユーザ | `osikatu_app` |
| `DB_PASSWORD` | DBパスワード | (secret) |
| `STRIPE_SECRET_KEY` | Stripe秘密鍵 | `sk_live_...` |
| `STRIPE_PRICE_PLUS` | Plus価格ID | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook署名シークレット | `whsec_...` |
| `BILLING_SUCCESS_URL` | Checkout成功URL | `https://osikatu.com/billing/complete` |
| `BILLING_CANCEL_URL` | Checkout中断URL | `https://osikatu.com/pricing` |
| `BILLING_PORTAL_RETURN_URL` | Portal戻りURL | `https://osikatu.com/settings/billing` |

### 任意（推奨）

| 変数名 | 用途 | デフォルト |
|--------|------|-----------|
| `QUEUE_CONNECTION` | Queueドライバ | `database` (本番は `redis` 推奨) |
| `CACHE_STORE` | キャッシュドライバ | `database` (本番は `redis` 推奨) |
| `SESSION_DRIVER` | セッション | `database` |
| `LOG_CHANNEL` | ログ出力先 | `stack` |
| `LOG_LEVEL` | ログレベル | `warning` (本番推奨) |
| `MAIL_MAILER` | メール送信 | `log` (本番は `smtp` / SES) |
| `REDIS_HOST` | Redisホスト | `127.0.0.1` |
| `REDIS_PORT` | Redisポート | `6379` |
| `PINS_V1_WRITE_MODE` | Pins書き込みモード | `delegate` |
| `BILLING_DEBUG_ENABLED` | Debug API (`/api/billing/debug`) を有効化 | `false` (本番は false 推奨) |

## 3. デプロイ手順

### 3.1 初回セットアップ

```bash
# 1. Clone
git clone <repo-url> /srv/osikatu
cd /srv/osikatu

# 2. Backend
cd laravel
composer install --no-dev --optimize-autoloader
cp .env.example .env
# .env を編集（上記の必須変数をすべて設定）
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 3. Frontend
cd ../frontend
npm ci --production
npm run build

# 4. Queue worker 起動（supervisor / systemd）
# → 下記 "Queue Worker 設定" 参照
```

### 3.2 通常デプロイ（更新リリース）

```bash
cd /srv/osikatu

# 1. Pull latest
git pull origin main

# 2. Backend
cd laravel
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 3. Queue restart（新コードを読み込ませる）
php artisan queue:restart

# 4. Frontend
cd ../frontend
npm ci --production
npm run build
# Next.js の再起動（PM2 / systemd で管理）
pm2 restart osikatu-frontend  # or: systemctl restart osikatu-frontend
```

### 3.3 Queue Worker 設定（supervisor 例）

```ini
[program:osikatu-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /srv/osikatu/laravel/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/osikatu/worker.log
stopwaitsecs=3600
```

#### 3.3.1 起動/状態確認/ログ確認（supervisor）

```bash
# 設定反映
supervisorctl reread
supervisorctl update

# 状態確認
supervisorctl status osikatu-worker:*

# 再起動（コード更新後は queue:restart も実行する）
supervisorctl restart osikatu-worker:*

# ログ確認
tail -n 200 -f /var/log/osikatu/worker.log
```

#### 3.3.2 Worker が止まった時の復旧チェックリスト

```bash
# 1) queue の設定確認（sync になっていないか / redis 接続など）
php /srv/osikatu/laravel/artisan tinker --execute="echo config('queue.default');"

# 2) 失敗ジョブ確認/再実行
php /srv/osikatu/laravel/artisan queue:failed
php /srv/osikatu/laravel/artisan queue:retry all

# 3) 新コード反映（worker が古いコードを保持しているケース）
php /srv/osikatu/laravel/artisan queue:restart

# 4) supervisor 側の再起動
supervisorctl restart osikatu-worker:*
```

> `.env` を変更した場合、`php artisan config:cache` を実行しないと反映されません（本番は config cache 前提）。

## 3.4 Queue Worker（Docker compose）

```bash
# 状態確認
docker compose -f docker-compose.prod.yml ps queue-worker

# ログ確認
docker compose -f docker-compose.prod.yml logs -f queue-worker

# 再起動
docker compose -f docker-compose.prod.yml restart queue-worker

# 失敗 Job の再実行
docker compose -f docker-compose.prod.yml exec api php artisan queue:retry all
```

## 3.5 Scheduler（Docker compose）

```bash
# 状態確認
docker compose -f docker-compose.prod.yml ps scheduler

# ログ確認
docker compose -f docker-compose.prod.yml logs -f scheduler

# 再起動
docker compose -f docker-compose.prod.yml restart scheduler

# 登録済みタスク確認
docker compose -f docker-compose.prod.yml exec api php artisan schedule:list
```

## 4. ヘルスチェック

```bash
# API health
# Endpoint added in PR 02
curl -f https://osikatu.com/api/healthz

# Production readiness check
curl -f https://osikatu.com/api/health/ready
# ok=true → all required env/config present
# ok=false → errors[] lists missing requirements

# 期待レスポンス:
# { "success": { "data": { "status": "ok", "db_ok": true, "time": "...", "app_version": "..." } } }
```

フロントエンドは Next.js の起動確認:

```bash
curl -f https://osikatu.com/ -o /dev/null -w '%{http_code}'
# → 200
```

## 5. ロールバック

### 5.1 コードレベル（git revert）

```bash
cd /srv/osikatu

# 直前のコミットを取り消し
git revert HEAD --no-edit
git push origin main

# デプロイ手順 3.2 を再実行
```

### 5.2 マイグレーション ロールバック

```bash
cd /srv/osikatu/laravel

# 直前バッチをロールバック
php artisan migrate:rollback --step=1

# 注意: データ削除を伴う場合は事前にバックアップ
```

### 5.3 Feature Flag による無効化

```bash
# Pins V1 書き込みモードの例
# .env で PINS_V1_WRITE_MODE=deny → config:cache で反映
php artisan config:cache
```

### 5.4 緊急メンテナンスモード

```bash
cd /srv/osikatu/laravel

# メンテナンス ON
php artisan down --secret="emergency-bypass-token"

# メンテナンス OFF
php artisan up
```

## 6. トラブルシューティング

| 症状 | 確認ポイント | 対処 |
|------|-------------|------|
| 502 Bad Gateway | php-fpm が起動しているか | `systemctl restart php-fpm` |
| Queue が動かない | supervisor status | `supervisorctl restart osikatu-worker:*` |
| Stripe webhook 失敗 | `STRIPE_WEBHOOK_SECRET` 設定漏れ | .env を確認 → config:cache |
| マイグレーション失敗 | DB接続/権限 | DB credentials と migrate:status 確認 |
| キャッシュ不整合 | config:cache / route:cache | `php artisan cache:clear && config:cache` |
| フロントエンド真っ白 | `NEXT_PUBLIC_API_BASE_URL` | .env.local を確認 → rebuild |

## 7. 関連ドキュメント

- [ローカル環境構築](../dev/workstation-setup.md)
- [Pins 移行手順](../dev/pins-deploy-runbook.md)
- [E2E 安定性](../dev/e2e-stability.md)
- [OperationLog 仕様](../dev/operation-log.md)
- [Stripe Webhook 障害復旧](./webhook-recovery.md)
