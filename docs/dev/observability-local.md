# Local Observability Stack

> Grafana + Loki + Promtail でアプリログを可視化する開発用スタック。

## ダッシュボード Import

リポジトリに同梱されているダッシュボード JSON を Grafana にインポートできます。

### ファイル

| ファイル | 内容 |
|----------|------|
| `docker/observability/dashboards/request-metrics.json` | リクエスト頻度・レイテンシ・5xx・スローリクエスト |
| `docker/observability/dashboards/rate-limit.json` | Rate limit ヒット数・リミッター別・IP別 |

### Import 手順

1. Grafana → Dashboards → New → Import
2. "Upload JSON file" で上記ファイルを選択
3. Data source に **Loki** を選択
4. Import

> **Note**: ダッシュボードは Loki data source の UID として `${DS_LOKI}` を使用します。Import 時に自動マッピングされます。
