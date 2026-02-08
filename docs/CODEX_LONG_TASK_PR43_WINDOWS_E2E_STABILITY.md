# CODEX_LONG_TASK_PR43_WINDOWS_E2E_STABILITY

## 目的
- PR #43（`fix(e2e): stabilize Windows preflight + sqlite self-heal + doctor`）を、
  安全ポリシー順守で検証・レビューし、必要なら最小修正を入れて、最終的に Squash merge で `main` へ取り込む。
- 重要: auto-kill は「known-safe だけ」。unknown は絶対 kill しない。`CI=true` は kill 無効。

## 対象PR
- PR #43: `main` <- `fix/e2e-windows-stability-doctor`
- URL: `https://github.com/kengo-suyama/osikatu/pull/43`

## 最重要ルール（Safety Policy）
1. 自動killは「known-safe（このrepo由来の確証が取れるもの）」のみ。
   - 確証が取れない PID/CommandLine は kill しない。
   - 不明な場合は fail-fast して、PID/ポート/可能ならCommandLineを出す。
2. `CI=true` のときは kill を絶対しない（診断のみで停止/失敗はOK）。
3. 破壊操作（sqlite削除/kill）は対象が「E2E専用」に限定されていることを検証する。
4. 変更は最小。プロダクションコードへ影響を出さない（tools/docs/package.json中心であることを確認）。

## 作業環境前提
- Windows + PowerShell
- リポジトリ: `C:\laragon\www\osikatu`
- Node 18+, PHP, git, gh が利用可能

---

## Phase 0: ブランチ取得・差分把握

### 1) 最新化
```powershell
cd C:\laragon\www\osikatu
git fetch origin --prune
```

### 2) ブランチ checkout（※ `<` `>` は PowerShell で禁止。絶対使わない）
```powershell
git switch -c fix/e2e-windows-stability-doctor origin/fix/e2e-windows-stability-doctor
```

### 3) 差分確認（どこを触っているか）
```powershell
git diff main...HEAD --stat
git diff main...HEAD
```

### 4) コンフリクトマーカー残骸検査
このコマンドは docs に自己ヒットしない形（`<{7}` 等）で書いてあるので、そのまま全体に対して実行してOK。

```powershell
git grep -n -E "^(<{7}|={7}|>{7})" -- . || echo "OK: no conflict markers"
```

期待:
- tools/docs/package.json 周辺の変更が中心で、アプリ本体挙動を変えない。

---

## Phase 1: 自動テスト & ローカルE2E検証（最低ライン）

### 1) tools テスト（ensure-ports-free の unit）
```powershell
cd frontend
npm ci
npm run tools:test
```
期待: PASS

### 2) doctor 実行（診断情報が過不足なく出る）
```powershell
npm run e2e:doctor
```
期待: ports IPv4/IPv6, PID/CommandLine, sqlite状態, git locks, versions, recent logs が出る

### 3) E2E（1回）
```powershell
npm run e2e:ci -- --repeat 1
```
期待: 37 passed（または現状のスイート数で全PASS）

### 4) `CI=true` の挙動確認（killしない）
```powershell
$env:CI="true"
npm run e2e:preflight
Remove-Item Env:\CI -ErrorAction SilentlyContinue
```
期待: `[preflight] CI=true detected; auto-kill is disabled.` が出て kill しない。

---

## Phase 2: セキュリティレビュー（auto-kill と sqlite自己復旧）

### A) `ensure-ports-free.cjs` のレビュー観点（必須）
- ポート確認が `127.0.0.1` と `::` の両方で行われているか
- Windows: PID/CommandLine の取得が確実か（netstat + Get-CimInstance）
- known-safe 判定の根拠が「このrepo由来」になっているか
  - Next dev: このrepoの `frontend/node_modules/next/.../start-server.js` で起動している等
  - Laravel: `php artisan serve` がこのrepoの `laravel` 配下から起動している等
- unknown は kill しないで fail-fast するか
- `E2E_KILL_KNOWN_LISTENERS=0|false|off` で kill 無効化できるか
- `CI=true` で kill をしないか（工具側・呼び出し側のどちらでも強制無効があると良い）

### B) `run-e2e-ci.cjs` の sqlite自己復旧レビュー観点（必須）
- 対象DBが `laravel/storage/osikatu-e2e.sqlite` のみか（他を触らない）
- `database disk image is malformed` 等の破損判定が過剰でないか
- 復旧（削除->再生成->migrate:fresh）を 1回だけリトライするか（無限ループ禁止）
- 失敗時のログが十分か（復旧した/しなかった理由が分かる）

### C) preflight 統合の観点（必須）
- `run-e2e-ci` の開始直後に preflight が走るか
- `CI=true` では kill しない（診断だけ）
- port が塞がっているときの fail メッセージが「次の手順」に繋がるか

---

## Phase 3: ドキュメント整合（README/runbook/agent docs）

### 1) `docs/GITHUB_AGENTS_PR43_WINDOWS_E2E.md` を確認
- GitHub Agents が「安全ポリシー->検証->レビュー->Squash」まで自走できる内容になっているか
- kill safety が最優先で明記されているか

### 2) `docs/AGENT_RUNBOOK.md` のリンクが正しいか
- リンク切れがないか

### 3) `docs/CODEX_LONG_TASK_WINDOWS_E2E.md` の grep 除外が適切か
- conflict marker grep が自己ヒットしない、かつリポジトリ全体を正しくチェックする形になっているか

---

## Phase 4: 必要なら最小修正を入れる（条件付き）

### 条件
- 重大: unknown kill の可能性が残る / `CI=true` でkillされ得る / sqlite復旧が広範囲を触る
- 重要: ログ不足で、fail時の原因究明ができない
- 軽微: 文言/READMEリンク/説明不足

### 方針
- “安全性 > 便利” を優先
- 修正は最小（toolsとdocs中心）
- 1コミットでまとめる（Squash予定のため）

### 修正後に必ず再実行
- `npm run tools:test`
- `npm run e2e:doctor`
- `npm run e2e:ci -- --repeat 1`
- `CI=true` で preflight が kill しない確認

---

## Phase 5: 最終アウトプット（PRコメント + Squash merge）

### A) PRコメント（最終報告テンプレ）
- Verification:
  - tools:test PASS
  - e2e:doctor 出力確認（要点）
  - e2e:ci repeat1 PASS（スイート数/時間）
  - `CI=true` で kill 無効確認
- Security:
  - known-safe 判定の根拠（Next/Laravel）
  - unknown kill なし / fail-fast
  - sqlite自己復旧が `osikatu-e2e.sqlite` のみ対象で 1回リトライ
- Merge decision:
  - Squash merge 推奨/可否
  - 注意点（もしあれば）
- Rollback:
  - `git revert <squash-sha>` で戻せる（migrate不要、tools中心）
  - 影響範囲は tools/docs 中心

### B) Squash merge（権限がある場合）
```powershell
gh pr merge 43 --squash --delete-branch --subject "fix(e2e): stabilize Windows preflight + sqlite self-heal + doctor" --body "Squash merge PR #43"
```

権限がない/CI未設定で不安がある場合:
- “ユーザーが押すだけ” の状態にする:
  - コメントで「ローカル検証OK」「安全ポリシーOK」「Squash推奨」を明記
  - ユーザーへ: GitHub UI で Squash merge を案内

---

## 実行コマンド（まとめ）
```powershell
cd C:\laragon\www\osikatu
git fetch origin --prune
git switch -c fix/e2e-windows-stability-doctor origin/fix/e2e-windows-stability-doctor
git diff main...HEAD --stat
git grep -n -E "^(<{7}|={7}|>{7})" -- .

cd frontend
npm ci
npm run tools:test
npm run e2e:doctor
npm run e2e:ci -- --repeat 1

$env:CI="true"
npm run e2e:preflight
Remove-Item Env:\CI -ErrorAction SilentlyContinue

# 必要なら修正->再テスト->push
cd ..\..
git status
git add -A
git commit -m "chore(e2e): tighten safety + docs for Windows stability"
git push -u origin fix/e2e-windows-stability-doctor

# 最終: merge（可能なら）
gh pr merge 43 --squash --delete-branch
```
