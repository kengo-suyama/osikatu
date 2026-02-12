# Production DB Runbook

> DB選定・接続・バックアップ・復旧で迷わない。

## 1. 推奨構成

| 項目 | 推奨 | 備考 |
|------|------|------|
| DB | Managed MySQL 8.0+ | AWS RDS / PlanetScale / DigitalOcean |
| 接続 | Private network | VPC内接続、パブリックIP無効 |
| バックアップ | 自動スナップショット | 日次、7日以上保持 |
| レプリカ | Read replica（任意） | トラフィック増加時に追加 |

> PostgreSQL 15+ でも動作するが、既存マイグレーションは MySQL 前提で書かれている。

## 2. .env 必須設定

```env
DB_CONNECTION=mysql
DB_HOST=<managed-db-host>
DB_PORT=3306
DB_DATABASE=osikatu
DB_USERNAME=osikatu_app
DB_PASSWORD=<strong-password>
```

### SSL接続（推奨）

```env
DB_SSL_CA=/path/to/ca-certificate.crt
# または MySQL の --ssl-mode=REQUIRED に相当
MYSQL_ATTR_SSL_CA=/path/to/ca-certificate.crt
```

## 3. 接続テスト

```bash
# Laravel から接続テスト
cd /srv/osikatu/laravel
php artisan tinker --execute "DB::select('SELECT 1 as ok'); echo 'DB OK';"

# healthz で確認
curl -s https://<domain>/api/healthz | jq .
# → { "success": { "data": { "db_ok": true } } }

# MySQL CLI から直接
mysql -h <host> -u osikatu_app -p osikatu -e "SELECT 1;"
```

## 4. マイグレーション手順

### 4.1 初回

```bash
cd /srv/osikatu/laravel
php artisan migrate --force
```

### 4.2 通常デプロイ時

```bash
# 1) 現在の状態確認
php artisan migrate:status

# 2) マイグレーション実行
php artisan migrate --force

# 3) 確認
php artisan migrate:status
```

### 4.3 ロールバック

```bash
# 直前のバッチをロールバック
php artisan migrate:rollback --step=1

# 注意: 破壊的変更（カラム削除等）はロールバック不可の場合あり
# 事前に docs/prod/migration-safety.md を確認
```

## 5. バックアップ / リストア

### 5.1 手動バックアップ（mysqldump）

```bash
# ダンプ
mysqldump -h <host> -u osikatu_app -p \
  --single-transaction --routines --triggers \
  osikatu > backup_$(date +%Y%m%d_%H%M%S).sql

# gzip 圧縮
mysqldump -h <host> -u osikatu_app -p \
  --single-transaction --routines --triggers \
  osikatu | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 5.2 リストア

```bash
# メンテナンスモードにする
php artisan down --secret="emergency-bypass-token"

# リストア
mysql -h <host> -u osikatu_app -p osikatu < backup_YYYYMMDD_HHMMSS.sql

# マイグレーション状態の整合確認
php artisan migrate:status

# メンテナンス解除
php artisan up
```

### 5.3 Managed DB のスナップショット（推奨）

```
AWS RDS: aws rds create-db-snapshot --db-instance-identifier osikatu-prod --db-snapshot-identifier manual-YYYYMMDD
DigitalOcean: doctl databases backups create <db-id>
```

## 6. トラブルシューティング

| 症状 | 確認 | 対処 |
|------|------|------|
| Connection refused | DB ホスト/ポート/VPC設定 | セキュリティグループ/ファイアウォール確認 |
| Access denied | ユーザー/パスワード | Managed DB のユーザー管理画面で確認 |
| Too many connections | `SHOW PROCESSLIST` | `max_connections` 増加 or コネクションプール調整 |
| Slow queries | `SHOW FULL PROCESSLIST` | インデックス追加、docs/prod/query-audit.md 参照 |
| Lock timeout | `SHOW ENGINE INNODB STATUS` | 長時間トランザクション特定、kill |

## 7. 関連ドキュメント

- [Production Runbook](./runbook.md)
- [Migration Safety](./migration-safety.md)
- [Backup/Restore](./backup-restore.md)
