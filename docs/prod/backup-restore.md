# Backup & Restore Runbook

> 事故っても戻せる。「復旧できる」が本番条件。

## 1. バックアップ方針

| レベル | 方法 | 頻度 | 保持期間 |
|--------|------|------|----------|
| DB スナップショット | Managed DB 自動 | 日次 | 7日 |
| DB 手動ダンプ | mysqldump | リリース前 | 30日 |
| ストレージ | S3/GCS sync | 日次 | 30日 |
| コード | Git tag | リリース毎 | 永久 |

## 2. 手動バックアップ（mysqldump）

### 2.1 フルダンプ

```bash
# 本番 DB のフルダンプ（トランザクション整合）
mysqldump -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD \
  --single-transaction --routines --triggers --events \
  $DB_DATABASE > /tmp/osikatu_full_$(date +%Y%m%d_%H%M%S).sql

# 圧縮
gzip /tmp/osikatu_full_*.sql

# S3 に転送（任意）
aws s3 cp /tmp/osikatu_full_*.sql.gz s3://osikatu-backups/db/
```

### 2.2 テーブル単体ダンプ（緊急時）

```bash
# 特定テーブルだけ
mysqldump -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD \
  --single-transaction \
  $DB_DATABASE billing_subscriptions webhook_event_receipts \
  > /tmp/osikatu_billing_$(date +%Y%m%d_%H%M%S).sql
```

### 2.3 Docker 環境

```bash
docker compose -f docker-compose.prod.yml exec api \
  php artisan tinker --execute "echo DB::getDatabaseName();"

# DB コンテナがある場合
docker compose exec db mysqldump --single-transaction osikatu > /tmp/backup.sql
```

## 3. リストア手順

### 3.1 フルリストア

```bash
# ⚠️ 本番で実行する場合は必ずメンテナンスモードにする
cd /srv/osikatu/laravel
php artisan down --secret="emergency-bypass-token"

# リストア
gunzip < /tmp/osikatu_full_YYYYMMDD.sql.gz | mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE

# マイグレーション状態を確認
php artisan migrate:status

# 必要に応じてマイグレーション実行（バックアップが古い場合）
php artisan migrate --force

# キャッシュクリア
php artisan config:cache
php artisan cache:clear

# メンテナンス解除
php artisan up

# ヘルスチェック
curl -s https://<domain>/api/healthz | jq .
```

### 3.2 テーブル単体リストア

```bash
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE < /tmp/osikatu_billing_YYYYMMDD.sql
```

### 3.3 Managed DB スナップショットからの復元

```bash
# AWS RDS
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier osikatu-prod-restored \
  --db-snapshot-identifier <snapshot-id>

# 復元後の手順:
# 1. 新インスタンスの endpoint を .env に設定
# 2. php artisan config:cache
# 3. php artisan migrate:status で確認
# 4. php artisan up
```

## 4. Storage バックアップ

```bash
# Laravel storage (uploads等)
rsync -avz /srv/osikatu/laravel/storage/app/ /backup/storage/app/

# または S3 sync
aws s3 sync /srv/osikatu/laravel/storage/app/public s3://osikatu-backups/storage/
```

## 5. 復旧テスト（月次推奨）

```bash
# 1. ダンプを取得
mysqldump ... > /tmp/test_restore.sql

# 2. テスト用 DB に復元
mysql -h localhost -u root test_osikatu < /tmp/test_restore.sql

# 3. マイグレーション状態確認
DB_DATABASE=test_osikatu php artisan migrate:status

# 4. 主要 API の動作確認
# /api/healthz, /api/me, etc.
```

## 6. 緊急時の優先順位

1. **メンテナンスモード ON** (`php artisan down`)
2. **原因特定**（DB 障害 / データ破損 / 誤操作）
3. **スナップショット確認**（最新の自動バックアップ時刻）
4. **リストア実行**（§3 参照）
5. **マイグレーション整合確認**
6. **ヘルスチェック**
7. **メンテナンスモード OFF** (`php artisan up`)

## 7. 関連ドキュメント

- [DB Runbook](./db-runbook.md)
- [Production Runbook](./runbook.md)
- [Migration Safety](./migration-safety.md)
