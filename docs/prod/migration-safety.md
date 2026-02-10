# Migration Safety Runbook

> 本番DBマイグレーションの安全手順。ロック・長時間マイグレーション対策。

## 1. 事前確認チェックリスト

- [ ] バックアップ取得済み（`docs/prod/backup-restore.md` 参照）
- [ ] マイグレーションファイルのレビュー済み
- [ ] ピーク時間帯を避ける（推奨: 平日深夜 or 早朝）
- [ ] ロールバック手順を確認済み
- [ ] 必要ならメンテナンスモード計画

## 2. マイグレーション前の状態確認

```bash
cd /srv/osikatu/laravel

# 現在の状態
php artisan migrate:status

# 未実行のマイグレーション確認
php artisan migrate --pretend
```

## 3. 安全なマイグレーションパターン

### 3.1 カラム追加（安全）

```php
// nullable カラム追加 → ロック軽量
$table->string('new_column')->nullable()->after('existing');
```

### 3.2 インデックス追加（注意）

```php
// 大テーブルではロック時間が長い
// MySQL 8.0+ は ALGORITHM=INPLACE で軽量
$table->index('column_name');
```

**大テーブル（10万行以上）のインデックス追加:**
```bash
# メンテナンスモード推奨
php artisan down --secret="bypass-token"
php artisan migrate --force
php artisan up
```

### 3.3 カラム削除（危険）

```php
// ロールバック不可能！
// 1. まずコードから参照を削除してデプロイ
// 2. 次のリリースでカラム削除
$table->dropColumn('old_column');
```

### 3.4 テーブル名変更（危険）

```php
// コードの全参照を同時に更新する必要がある
// ダウンタイムが発生する可能性
Schema::rename('old_table', 'new_table');
```

## 4. 実行手順

### 4.1 通常マイグレーション

```bash
# 1. バックアップ
mysqldump ... > backup_pre_migrate.sql

# 2. 実行
php artisan migrate --force

# 3. 確認
php artisan migrate:status

# 4. アプリケーション動作確認
curl -s https://<domain>/api/healthz | jq .
```

### 4.2 大規模マイグレーション（メンテナンス付き）

```bash
# 1. バックアップ
mysqldump ... > backup_pre_migrate.sql

# 2. メンテナンスモード
php artisan down --secret="bypass-token"

# 3. 実行
php artisan migrate --force

# 4. 確認
php artisan migrate:status

# 5. メンテナンス解除
php artisan up

# 6. ヘルスチェック
curl -s https://<domain>/api/healthz | jq .
```

## 5. ロールバック

### 5.1 安全なロールバック

```bash
php artisan migrate:rollback --step=1
```

### 5.2 ロールバック不可の場合

- カラム削除マイグレーション → バックアップからリストア
- データ変換マイグレーション → バックアップからリストア

## 6. トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| Lock wait timeout | 長時間トランザクション | `SHOW PROCESSLIST` で特定→kill |
| Migration stuck | テーブルロック | `SHOW ENGINE INNODB STATUS` → ロック解除 |
| Out of disk | 一時ファイル肥大 | ディスク空き確認、tmpdir 変更 |
| Foreign key error | 依存テーブル順序 | マイグレーション順序を確認 |

## 7. 関連ドキュメント

- [DB Runbook](./db-runbook.md)
- [Backup/Restore](./backup-restore.md)
- [Production Runbook](./runbook.md)
