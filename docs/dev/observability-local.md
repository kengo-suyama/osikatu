# Local Observability Stack

> Grafana + Loki + Promtail でアプリログを可視化する開発用スタック。

## 前提

- Docker / Docker Compose が動くこと
- Laravel ログが `laravel/storage/logs/laravel.log` に出力されていること

## 起動

```bash
cd docker/observability
docker compose -f docker-compose.observability.yml up -d
```

## アクセス

| サービス | URL | 認証 |
|----------|-----|------|
| Grafana | http://localhost:3001 | admin / admin |
| Loki API | http://localhost:3100 | なし |

## Grafana で Loki データソースを追加

1. Grafana → Connections → Data sources → Add data source
2. Type: **Loki**
3. URL: `http://loki:3100`
4. Save & Test

## ログ検索

Grafana → Explore → Data source: Loki

```logql
{job="laravel"} |= "request_metrics"
{job="laravel", level="ERROR"}
{job="laravel"} | json | type = "request_metrics" | duration_ms > 1000
```

## 停止

```bash
cd docker/observability
docker compose -f docker-compose.observability.yml down
```

## データ削除（リセット）

```bash
docker compose -f docker-compose.observability.yml down -v
```

## ポートカスタマイズ

環境変数で上書き可能:

```bash
GRAFANA_PORT=4000 LOKI_PORT=3200 docker compose -f docker-compose.observability.yml up -d
```

## 既存 prod compose への影響

**なし。** このスタックは完全に独立した compose ファイルで、本番 `docker-compose.prod.yml` とは分離されています。

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| Promtail がログを拾わない | `laravel/storage/logs/laravel.log` が存在するか確認 |
| Grafana で Loki に繋がらない | Data source URL が `http://loki:3100` であること（localhost ではない） |
| ポート競合 | GRAFANA_PORT / LOKI_PORT 環境変数で変更 |
