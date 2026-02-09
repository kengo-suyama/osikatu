# Database Backup Automation

## コマンド一覧

### db:backup

mysqldumpを生成する。

\`\`\`bash
# ドライラン（コマンド確認のみ）
php artisan db:backup --dry-run

# 実行
php artisan db:backup
\`\`\`

出力: \`backup_osikatu_20260209_120000.sql.gz\`

### db:restore-smoke

バックアップの整合性を簡易チェックする。

\`\`\`bash
# 現在のDBテーブル数を確認
php artisan db:restore-smoke --dry-run

# ファイルの存在/サイズ確認
php artisan db:restore-smoke backup_osikatu.sql.gz --dry-run

# 実際にリストア（dev/testのみ！確認プロンプトあり）
php artisan db:restore-smoke backup_osikatu.sql.gz
\`\`\`

## 注意

- \`db:backup\` はmysqldumpに依存。Docker内で実行する場合はmysql-clientが必要。
- 本番での自動バックアップはManaged DBのスナップショットを使用（docs/prod/backup-restore.md参照）。
- \`db:restore-smoke\` は **本番では使わない** こと。dev/testのみ。
