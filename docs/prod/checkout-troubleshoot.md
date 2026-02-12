# "勝手 Checkout" 緊急対応 3コマンド

> 不正な checkout session が発生した場合の即応手順。docs 先頭に固定。

## 即応 3 コマンド

### 1. 直近の checkout ログを取得

```bash
grep "billing_checkout_created\|billing_checkout_denied\|billing_checkout_failed" \
  /var/log/osikatu/*.log | tail -30
```

**取得物:** user_id, result, http_status, timestamp
**読み方:** `billing_checkout_created` が正常、`denied` はゲスト拒否、`failed` は Stripe 障害

### 2. Webhook 受信状況を確認

```bash
grep "billing_webhook_received\|billing_webhook_verified\|billing_webhook_duplicate" \
  /var/log/osikatu/*.log | tail -30
```

**取得物:** stripe_event_id, event_type, result
**読み方:** `verified + result=success` が正常、`fail + reason=invalid_signature` は署名エラー

### 3. サブスク同期状態を確認

```bash
cd /srv/osikatu/laravel && php artisan tinker --execute "
  \$subs = App\Models\BillingSubscription::orderByDesc('updated_at')->limit(10)->get(['id','user_id','plan','status','stripe_subscription_id','updated_at']);
  echo \$subs->toJson(JSON_PRETTY_PRINT);
"
```

**取得物:** user_id, plan, status, stripe_subscription_id
**読み方:** `status=active` + `plan=plus` が正常

## 判断フロー

```
checkout ログに不審な user_id?
  ├── YES → ユーザー調査（3のコマンドで確認）
  │         → Stripe Dashboard で該当 session を確認
  │         → 必要なら手動キャンセル
  └── NO  → webhook ログに失敗?
             ├── YES → docs/prod/webhook-recovery.md を参照
             └── NO  → 正常。監視継続
```

## Stripe Dashboard で確認

1. [Stripe Dashboard](https://dashboard.stripe.com/) > Payments
2. 該当の checkout session を検索
3. metadata の `user_id` / `device_id` を確認
4. 不正であれば Refund / Cancel

## 関連ドキュメント

- [Webhook Recovery](./webhook-recovery.md)
- [Production Runbook](./runbook.md)
