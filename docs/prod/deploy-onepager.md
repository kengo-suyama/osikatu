# Production Deploy Onepager

> 最短手順でデプロイし、確認し、ロールバックできる 1 枚。

## 0. 事前準備（初回のみ）

- ドメイン/HTTPS
  - `APP_URL=https://<domain>`
  - Next.js も同一ドメイン配下で公開（`https://<domain>`）
- 環境変数（必須）
  - `docs/prod/runbook.md` の「環境変数一覧」に従う
- DB / Queue
  - MySQL/Redis を用意（本番は Queue/CACHE は `redis` 推奨）
  - Queue worker を常駐起動（Supervisor/systemd いずれか）

## 1. デプロイ（更新リリース）

```bash
cd /srv/osikatu

# 1) Pull
git pull origin main

# 2) Backend (Laravel)
cd laravel
composer install --no-dev --optimize-autoloader
php artisan migrate --force

# 3) Cache (env を変えた場合は必須)
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4) Queue (新コード反映)
php artisan queue:restart

# 5) Frontend (Next.js)
cd ../frontend
npm ci --production
npm run build

# 6) Restart frontend process (PM2/systemd)
pm2 restart osikatu-frontend  # or: systemctl restart osikatu-frontend
```

## 2. 検証（必須チェック）

```bash
# Readiness (env/config cache/queue 推奨設定など)
curl -s https://<domain>/api/health/ready | jq .

# API health
curl -sf https://<domain>/api/healthz

# Pricing (Upgrade導線)
curl -sf https://<domain>/pricing -o /dev/null
```

運用ログ（Stripe webhook）:

```bash
grep "billing_webhook_" /var/log/osikatu/*.log | tail -50
grep "billing_subscription_synced" /var/log/osikatu/*.log | tail -50
```

## 3. ロールバック

### 3.1 コード（git revert）

```bash
cd /srv/osikatu
git revert HEAD --no-edit
git push origin main

# その後、デプロイ手順 (1) を再実行
```

### 3.2 マイグレーション（原則: 慎重に）

```bash
cd /srv/osikatu/laravel
php artisan migrate:rollback --step=1
```

注意:

- 破壊的変更がある場合はロールバックが危険（バックアップ/手順合意が必要）
- `.env` を変えたら `config:cache` しないと反映されない

## 4. 参照

- `docs/prod/runbook.md`
- `docs/prod/webhook-recovery.md`

