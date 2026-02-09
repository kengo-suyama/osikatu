# Account Deletion Policy

> 利用停止・退会時のデータ保持ポリシー。トラブル予防のための明文化。

## 1. 退会フロー

1. ユーザーが `DELETE /api/me/account` を実行
2. User レコードに `deleted_at` タイムスタンプが設定される（soft delete）
3. 以降のAPI認証は拒否される

## 2. データ保持ポリシー

| データ種別 | 退会後の扱い | 保持期間 |
|-----------|-------------|----------|
| User レコード | soft-delete（`deleted_at` 設定） | 90日 |
| MeProfile | 保持（user_id で紐付き） | 90日 |
| サークルメンバーシップ | 保持（孤立状態） | 90日 |
| 投稿・コメント | 保持 | 90日 |
| 割り勘データ | 保持 | 90日 |
| BillingSubscription | 保持 | 90日 |
| OperationLog | 保持 | 90日 |
| Notification | 保持 | 90日 |

## 3. 復旧可否

| 期間 | 復旧 | 方法 |
|------|------|------|
| 0-90日 | 可能 | DB上の `deleted_at` を NULL に戻す（管理者操作） |
| 90日以降 | 不可（予定） | 自動パージ（未実装） |

### 復旧手順（管理者）

```bash
cd /srv/osikatu/laravel
php artisan tinker --execute "
  \$user = App\Models\User::withTrashed()->find(USER_ID);
  echo \$user->email . ' deleted_at=' . \$user->deleted_at;
  \$user->restore();
  echo ' -> restored';
"
```

## 4. Stripe サブスクリプション

- 退会してもStripe側のサブスクリプションは自動キャンセルされない
- 管理者が手動でStripe Dashboardからキャンセルする必要がある
- TODO: 退会時に自動キャンセルAPIを呼ぶ処理を追加

## 5. UI注意書き（退会確認画面）

退会確認画面に以下を表示すること:

> **アカウントを削除すると:**
> - すべての機能にアクセスできなくなります
> - サークルのメンバーシップが無効になります
> - 90日以内であれば復旧できる場合があります
> - Plusプランの場合、別途Stripe側でのキャンセルが必要です

## 6. 自動パージ（将来実装予定）

```
# Scheduled command (未実装)
php artisan users:purge-deleted --days=90
```

対象:
- `deleted_at` が90日以上前のユーザー
- 関連するMeProfile, CircleMember, Notification等を削除
- BillingSubscriptionは監査ログとして保持

## 7. 関連ドキュメント

- [Data Retention Policy](./data-retention.md)
- [Production Runbook](./runbook.md)
