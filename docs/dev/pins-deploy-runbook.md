# Pins Deploy Runbook (circle_pins migration)

目的: `circle_pins` 移行後に「過去ピンが見えない」事故を防ぎ、確実に復旧できる手順を固定する。

前提:
- `_evidence/` などのログはコミットしない
- `circle_pins` は `posts.is_pinned` の既存データを自動では持っていない
- 互換のため v1 pins API（`/api/circles/{circle}/pins` の write）は残っているが deprecated。新規実装は `pins-v2` を使う。
- 本番環境によっては `config:cache` が有効。env を変えた場合は反映手順（運用の runbook）に従う。

## 0) 事前条件（デプロイ直後の確認）

- migration が反映済み（`circle_pins` が存在）
- API が起動している
- `php artisan` を実行できる（本番/ステージングの実行権限）

## 1) Backfill（posts -> circle_pins, dry-run）

```powershell
cd C:\laragon\www\osikatu\laravel
php artisan app:backfill-circle-pins --dry-run
```

期待:
- `scanned` / `upserted` が表示される
- dry-run はDBを書き換えない

## 2) Backfill（posts -> circle_pins, 本実行）

```powershell
cd C:\laragon\www\osikatu\laravel
php artisan app:backfill-circle-pins
```

注意:
- idempotent（同じ `source_post_id` は `updateOrCreate` で更新）なので、途中失敗しても再実行可能

## 3) Backfill（circle_pins.sort_order, dry-run）

並び順を「新しいピンが上」で決定的にするため、`sort_order` が null の行を埋める。

```powershell
cd C:\laragon\www\osikatu\laravel
php artisan app:backfill-circle-pins-sort-order --dry-run
```

期待:
- `circles` / `filled` が表示される
- dry-run はDBを書き換えない

## 4) Backfill（circle_pins.sort_order, 本実行）

```powershell
cd C:\laragon\www\osikatu\laravel
php artisan app:backfill-circle-pins-sort-order
```

注意:
- idempotent（`sort_order is null` の行だけを埋める）なので、途中失敗しても再実行可能
- 付与ルールは「古い -> 小さい」「新しい -> 大きい」。結果として新しいピンが上に来る。

## 5) 検証（API）

少なくとも 1サークルで確認する:

- `GET /api/circles/{id}/pins` が期待件数を返す
- `title/url/body` が欠けていない
- `sortOrder` が（原則）nullではない
- 返却順が「新しいピンが上」になっている

例（ローカル。`X-Device-Id` は手元の値に合わせる）:

```powershell
curl.exe -i http://127.0.0.1:8000/api/circles/123/pins -H \"X-Device-Id: device-xxx\"
```

## 6) 検証（UI）

- Hub の「遠征情報（ピン）」に表示される
- `/circles/{id}/pins` に一覧が表示される
- 新しいピンほど上に並ぶ

## 7) 失敗時の対処

- まず `php artisan app:backfill-circle-pins --dry-run` を再実行し、対象件数が残っているか確認
- 本実行を再実行（idempotent）
- `sort_order` の問題が疑わしい場合は `php artisan app:backfill-circle-pins-sort-order --dry-run` を実行して `filled` が残っているか確認
- `filled > 0` のままなら本実行を再実行（idempotent）
- それでもNGなら、`circle_pins` の migration / APIログ / DB接続 を確認（機密は `_evidence/`）

補足:
- 移行の全体像は `docs/dev/pins-migration.md`
