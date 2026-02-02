# E2E / CI Gate 運用メモ

## ci:gate

以下を順番に実行します。

- lint
- titles:verify（titles:gen → titles:check → git diff --exit-code）
- e2e:ci

```bash
npm run ci:gate
```

## Playwright アーティファクトの仕様

- screenshot: `only-on-failure` → 失敗時のみ生成
- video: `retain-on-failure` → 失敗時のみ生成
- trace: `on-first-retry`
  - CI で `retries=1` のとき、**1回目失敗 → リトライ発生時のみ** 生成
  - 単発でFAILして終了（リトライ無し）の場合、trace が無いのは仕様

**trace が必要な場合は、必ずリトライを発生させること。**

## trace を確実に取る方法

### ローカル（推奨）

```bash
npm run e2e:trace
```

同等の手動コマンド例：

```bash
npx playwright test --retries=1 --trace=on-first-retry
```

### CI 環境相当

`retries=1` を有効にして `e2e:ci` を実行（現在の設定）。

## 成果物（test-results）の整理方針

- test-results/ と playwright-report/ は基本ローカル用途（コミットしない想定）
- ローカルで肥大化したら削除してOK
  - frontend/test-results/
  - frontend/playwright-report/
- 失敗時に残したいもの
  - screenshot / video / trace（trace はリトライ時のみ生成）
- 収集手順の例
  - 失敗時は test-results/ を zip して共有

## ログ保存（ci:gate / e2e:trace）

PowerShell 前提でログをファイルに保存します（上書き）。

```bash
npm run ci:gate:log
```

任意で trace 取得時のログも保存できます。

```bash
npm run e2e:trace:log
```

## タイムスタンプ付きログ（追記）

固定名ログとは別に、タイムスタンプ付きで保存したい場合は以下を使います。

```bash
npm run ci:gate:log:ts
npm run e2e:trace:log:ts
```

生成先:

- `frontend/logs/ci-gate_YYYYMMDD_HHMMSS.log`
- `frontend/logs/e2e-trace_YYYYMMDD_HHMMSS.log`

e2e:trace のタイムスタンプ版は、最新の trace zip を `test-results/tools` にコピーします。

- `frontend/test-results/tools/trace_YYYYMMDD_HHMMSS.zip`

trace が見つからない場合は `e2e:trace:log:ts` が失敗します。  
`e2e:trace:log:ts` は `e2e:ci:trace` でサーバを自動起動し、trace を必ず生成します。
