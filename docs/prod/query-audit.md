# Query Performance Audit

> 重いエンドポイント上位3つのクエリ分析と改善指針。

## 1. 対象エンドポイント

| # | エンドポイント | 理由 |
|---|--------------|------|
| 1 | `GET /api/circles/{id}/settlements/expenses` | JOIN + SUM + フィルタ |
| 2 | `GET /api/circles/{id}/chat/messages` | 大量行 + ORDER BY DESC |
| 3 | `GET /api/me/notifications` | user_id + read_at + ORDER BY DESC |

## 2. EXPLAIN 結果と改善

### 2.1 Settlement Expenses

```sql
EXPLAIN SELECT * FROM settlement_expenses
  WHERE circle_id = ?
  ORDER BY created_at DESC
  LIMIT 50;
```

**推奨インデックス:**
```sql
CREATE INDEX idx_settlement_expenses_circle_created
  ON settlement_expenses (circle_id, created_at DESC);
```

**既存:**
- `circle_id` のインデックスあり
- `created_at` との複合インデックスが望ましい

### 2.2 Chat Messages

```sql
EXPLAIN SELECT * FROM circle_chat_messages
  WHERE circle_id = ?
  ORDER BY id DESC
  LIMIT 50;
```

**推奨インデックス:**
```sql
-- id は PK なので circle_id でフィルタ後、PK順で高速
CREATE INDEX idx_chat_messages_circle
  ON circle_chat_messages (circle_id);
```

**既存:**
- `circle_id` インデックスあり → OK

### 2.3 Notifications

```sql
EXPLAIN SELECT * FROM notifications
  WHERE user_id = ?
  ORDER BY id DESC
  LIMIT 20;
```

**推奨インデックス:**
```sql
CREATE INDEX idx_notifications_user
  ON notifications (user_id, id DESC);
```

**既存:**
- `user_id` インデックスあり
- 未読フィルタ (`WHERE read_at IS NULL`) 用に部分インデックスを検討

## 3. 確認手順

```bash
cd /srv/osikatu/laravel

# MySQL slow query log 有効化（一時的）
mysql -e "SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 0.5;"

# N+1 検出（開発環境）
# Laravel Debugbar or Telescope を使用

# 本番のスロークエリ確認
mysql -e "SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 20;"
```

## 4. 将来の監視

- RequestMetrics middleware で `duration_ms > 1000` のリクエストをアラート
- MySQL Performance Schema で定期的にトップクエリを確認

## 5. 関連ドキュメント

- [DB Runbook](./db-runbook.md)
- [Migration Safety](./migration-safety.md)
