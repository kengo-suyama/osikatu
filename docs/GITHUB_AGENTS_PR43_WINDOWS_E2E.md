# GitHub Agents Autonomy: PR #43 (Windows E2E Stability)

対象: Osikatu / PR #43 / Windows (Laragon) E2E安定化

## 0) ミッション（最終ゴール）

PR #43 `fix(e2e): stabilize Windows preflight + sqlite self-heal + doctor` を、安全ポリシーを守ったままレビューし、問題がなければ Squash merge で `main` に取り込む。

CIが無い/チェックが出ない前提でも、ローカル検証ログと自動テストの証跡を残し、将来の運用ドキュメントに反映する。

### 対象PR
- PR: `#43`
- base: `main`
- head: `fix/e2e-windows-stability-doctor`
- URL: `https://github.com/kengo-suyama/osikatu/pull/43`

## 1) 絶対に守る安全ポリシー（破ったら作業停止）

このPRの核心は「ポート競合の自動解消」だが、自動 kill は known-safe のみ。

- ✅ known-safe（このrepo由来と確証が取れる）だけ kill 可
- ❌ unknown（判別不能/他プロジェクト疑い）は kill 禁止 -> fail fast（PID/CommandLine出す）
- ✅ `CI=true` の場合は kill 無効（診断だけ）

例外は作らない。迷ったら kill しない。

## 2) 成果物（エージェントが出すアウトプット）

作業が終わったら、次の3点をPRコメントに残す（またはローカルログとして提示）。

### (A) Verification Report（短くても必須）
- `tools:test`
- `e2e:doctor`
- `e2e:ci --repeat 1`
- `CI=true preflight`（killしない確認）

それぞれの結果とログファイル名。

### (B) Security Review（known-safe判定レビュー）
- `ensure-ports-free.cjs` の判定ロジックが「repo由来の根拠」を持つか
- “Next dev” 判定の根拠（`node_modules/next` の `start-server.js` など）
- “artisan serve” 判定の根拠（`laravel` 配下のパス一致など）
- unknown を kill しないことの確認

### (C) Merge Decision（Squash可否）
- ✅ Squash merge推奨 or ❌ 修正が必要（理由と修正案）

## 3) ローカルでの再現・検証手順（この順で実施）

### 3-1) ブランチ取得と差分確認
```powershell
git fetch origin
git switch -c verify/pr43 origin/fix/e2e-windows-stability-doctor
git log --oneline --decorate -n 20
git diff origin/main...HEAD --stat
```

### 3-2) コンフリクトマーカー確認（必須）
注意: このドキュメント自体にチェック用の文字列が含まれるため、除外して実行する。

```powershell
git grep -n -E "^(<{7}|={7}|>{7})" -- . || true
```

ヒットしたら作業停止して、該当ファイルを修正する（PRにpush）。

### 3-3) ツールテスト（安全性の最低ライン）
```powershell
cd frontend
npm run tools:test
```

### 3-4) doctor（診断が機能するか）
```powershell
npm run e2e:doctor
```

期待: ports IPv4/IPv6、PID+CommandLine、sqlite状態、git locks、node/npm/php、recent logs候補。

### 3-5) E2E 本実行（repeat1）
```powershell
npm run e2e:ci -- --repeat 1
```

期待: 37 passed。

失敗したら、ログに出た Phase と症状を分類し、以下の「失敗時の分岐」に従う。

### 3-6) `CI=true` の安全挙動（killしない）
```powershell
cd frontend
$env:CI="true"
npm run e2e:preflight
Remove-Item Env:\CI -ErrorAction SilentlyContinue
```

期待:
- `CI=true detected; auto-kill is disabled` が出る
- unknown を kill せずに止まる（fail fast） or 診断だけ

## 4) レビュー観点（ファイル別にチェック）

### 4-1) `frontend/tools/ensure-ports-free.cjs`（最重要: 安全）
- known-safe 判定が「文字列一致の曖昧さ」だけに頼ってないか
- Next.js の判定はこのrepoの `frontend/` 配下を根拠にしているか
- Laravel の判定はこのrepoの `laravel/` 配下を根拠にしているか
- unknown は kill しない（PID表示して止まる）
- `E2E_KILL_KNOWN_LISTENERS=0|false|off` で kill 無効になる
- IPv6無効環境でも false negative を避ける実装になっている

### 4-2) `frontend/tools/run-e2e-ci.cjs`（安定性: 後始末）
- preflight が開始直後に走る（Phase1）
- sqlite self-heal（破損検知 -> 削除 -> 再生成 -> `migrate:fresh` retry 1回だけ）（Phase2）
- 例外時も cleanup が走り、ポート/lock が残りにくい

### 4-3) `frontend/tools/e2e-doctor.cjs`（診断）
- 必要な情報が過不足なく出る（ports/PID/CommandLine/sqlite/git lock/versions/log候補）
- 破壊的操作をしない（診断のみ）

### 4-4) `frontend/package.json`（導線）
- `e2e:preflight` `e2e:doctor` `tools:test` が追加されている
- 既存 `e2e:ci` の挙動に破壊的変更がない

### 4-5) docs（運用の現実解）
- runbook が「証拠 -> 判断 -> 復旧」の順で書かれている
- “unknown kill禁止” のルールが明文化されている
- README導線がある（迷子にならない）

## 5) 失敗時の分岐（エージェントが勝手に迷走しないため）

### 5-1) `Port 8001/3103 already in use`
- doctorで PID/CommandLine を確認
- known-safe なら `ensure-ports-free` が kill できるはず
- unknown なら kill せず止める -> ユーザーに PID/CommandLine を提示して判断を仰ぐ（勝手に kill しない）

### 5-2) sqlite `database disk image is malformed`
- Phase2 の self-heal が動くか確認（自動復旧 -> retry 1回）
- 動かないなら、self-heal のトリガ条件/例外捕捉を修正し PR #43 に追加コミットする

### 5-3) spawn EPERM / wait-on timeout
- runbookの手順に沿って診断ログ採取
- 再現条件をメモ（node残留/VSCode lock/権限/ウイルス対策など）
- 可能なら doctor 出力に不足がないか検討して追加

### 5-4) `.git/HEAD` / `index.lock` 問題
- doctorが lock を検知できるか
- cleanupが走ったのに lock が残るなら `run-e2e-ci` の finalize/例外経路を見直す

## 6) マージ手順（Squash推奨）

条件:
- `cd frontend && npm run tools:test` PASS
- `cd frontend && npm run e2e:doctor` 出力OK
- `cd frontend && npm run e2e:ci -- --repeat 1` で 37 passed
- `CI=true` で kill しない
- 安全ポリシー違反なし

実行（GitHub UI）:
- Squash and merge

Squash message 例:
```
fix(e2e): stabilize Windows preflight + sqlite self-heal + doctor
```

マージ後チェック（最小）:
```powershell
git switch main
git pull origin main
cd frontend
npm run tools:test
npm run e2e:doctor
npm run e2e:ci -- --repeat 1
```

## 7) PRコメントテンプレ（最終報告に貼る）

```text
Verification:
- tools:test: PASS
- e2e:doctor: OK (ports/PID/sqlite/git locks/versions/log candidates)
- e2e:ci --repeat 1: 37 passed
- CI=true preflight: auto-kill disabled confirmed
- logs: <log filenames>

Security review (ensure-ports-free):
- known-safe criteria: <根拠>
- unknown kill prevented: confirmed
- kill opt-out env: confirmed

Merge decision:
- ✅ Squash merge OK (or ❌ changes requested: <list>)
```

## 8) 追加タスク（任意: CIが無い場合の現実的改善案）

CI未設定/チェック未報告の場合は、以下のどちらかを提案（作業は勝手に始めない、提案だけ）。
- GitHub Actions で `npm run tools:test` と `npm run e2e:doctor` だけ回す（E2E本体は除外可）
- もしくは “ローカル証跡必須” を docs に明記して運用に寄せる
