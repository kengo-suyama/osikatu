# E2E Stability: Stress Runner & Report

## Overview

flaky テストを「数で潰す」ための仕組み。
smoke suite を N 回繰り返し、失敗 spec・失敗メッセージの Top を集計する。

## 実行手順

### 1. Stress Run（N回繰り返し実行）

```powershell
cd frontend
npm run e2e:stress -- 20 2>&1 | Tee-Object -FilePath logs/e2e-stress.log
```

- 引数: 繰り返し回数（デフォルト 5）
- 対象 spec: `run-e2e-stress.mjs` 内の `E2E_STRESS_CMD` で指定
- タイムアウト: 1回あたり最大 5分

### 2. レポート生成

```powershell
npm run e2e:stress:report -- logs/e2e-stress.log
```

出力: `logs/e2e-stress-report.md`

### 3. レポートの読み方

```markdown
# E2E Stress Report
Runs: 20 (pass 17, fail 3)

## Top Failing Specs (Best-Effort)
- 3x `tests/e2e/circle-hub-navigation.spec.ts`

## Top Error Snippets (Best-Effort)
- 2x `Error: Timeout 30000ms exceeded.`
- 1x `Error: expect(received).toBeVisible()`
```

- **Per-Spec Pass Rate**: 推定pass率（失敗回数 / 総runs から計算）
- **Top Failing Specs**: 失敗回数が多い spec ファイル
- **Top Error Snippets**: 頻出エラーメッセージ（先頭160文字）

## カスタマイズ

対象 spec を変更する場合:

```powershell
$env:E2E_STRESS_CMD = "npx playwright test tests/e2e/my-target.spec.ts --reporter=line --workers=1"
npm run e2e:stress -- 10
```

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `scripts/run-e2e-stress.mjs` | N回繰り返し実行、pass/fail集計 |
| `scripts/e2e-stress-report.mjs` | ログ解析、失敗top集計レポート生成 |
| `logs/e2e-stress.log` | 実行ログ（git ignore推奨） |
| `logs/e2e-stress-report.md` | レポート出力 |
