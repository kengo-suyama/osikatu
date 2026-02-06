# Codex Autonomy + Testing Runbook (osikatu)

このドキュメントは「Codexが自律して実装→テスト→PR作成」まで回すための運用手順です。
最優先は **差分最小・既存仕様準拠・E2E/CIを壊さない** です。

---

## 0) 前提（固定）

- Repo: `C:\laragon\www\osikatu`
- Frontend: `C:\laragon\www\osikatu\frontend`
- Backend(Laravel): `C:\laragon\www\osikatu\laravel`
- main への direct push は禁止（PR必須）
- API envelope / camelCase / X-Device-Id などの既存ルールは厳守

---

## 1) Codex 自律の基本プロトコル（STOP条件あり）

### 1-1. 必ず最初にやる（証拠採取）
```powershell
cd C:\laragon\www\osikatu
git status -sb
git switch main
git pull
git log -5 --oneline --decorate

1-2. ブランチは必ず main 最新から作る
git switch -c feature/<topic>

1-3. 自律で進めて良い範囲

既存UI/既存APIの小さな整合、data-testid追加、軽微な修正、ドキュメント追記

既存ルール内でのリポジトリ層追加（frontend/lib/repo/*）

Laravel側の小規模エンドポイント追加・修正（既存仕様準拠）

1-4. STOP（ここで止まって証拠だけ報告）

次のいずれかに当たったら 破壊操作なしで停止し、証拠（コマンド出力）だけ提示する。

テスト失敗の原因が不明（どのPRの責務か判断できない）

DB migration や既存データ互換に影響しそうで判断が必要

API仕様を変えないと要件を満たせない

lint / type error が “既存由来” か “今回由来” か判定不能

rebase/merge でコンフリクトが大きい（判断が必要）

2) 実装の原則（差分最小）

1 PR = 1目的（混ぜない）

Backend DTO変更したら、同PRで frontend/lib/types.ts も必ず更新

UI側は「画面から直fetch」を避け、既存の repo 層を踏襲（あるなら）

data-testid は “E2Eが安定する最小箇所” だけ追加（乱発しない）

改行（CRLF/LF）警告は基本無視（差分が改行地獄になったらSTOPして提案）

3) テスト方針（最小セット → 余裕があれば拡張）
3-1. 最小セット（PRに必ず書く）

Frontend

cd C:\laragon\www\osikatu\frontend
npm run lint
npm run titles:verify


Backend

cd C:\laragon\www\osikatu\laravel
php artisan test


※ 全部回せない場合は、回せたものだけを “事実” としてPR本文に書く（推測禁止）

4) E2E（Playwright）実行手順
4-1. ローカルE2E（軽い）

（スクリプトがある場合）

cd C:\laragon\www\osikatu\frontend
npm run e2e

4-2. CI相当（ポート固定：衝突しやすい）

e2e:ci が以下の固定ポートを使う想定：

Frontend: 127.0.0.1:3103

Backend: 127.0.0.1:8001

実行：

cd C:\laragon\www\osikatu\frontend
npm run e2e:ci

4-3. 8001 が塞がっているとき（よくある）

PID特定：

netstat -ano | findstr :8001


プロセス確認：

Get-Process -Id <PID> | Select-Object Id,ProcessName,Path


原因が php.exe（XAMPP等）なら、該当プロセス停止 or 起動元を終了してから再実行。
原因特定できない/止めて良いか不明なら STOP。

5) 画面スモーク（最低限の目視チェック項目）

変更が UI/API に触れるなら、PR本文に “やった/やってない” を明記する。

/home

Freeユーザーで AdBanner が出る（要件次第）

予算設定が意図通り（重複欄がない 等）

/circles/[id]/album

上限超えで quota_exceeded メッセージ

/circles/[id]/chat

スタンプ/メディア送信UIが動く

/circles/[id]

お知らせカードが表示・削除できる

6) 変更前の安全確認（コミット直前チェック）
6-1. 変更ファイルが想定どおりか
cd C:\laragon\www\osikatu
git status -sb
git diff --name-only

6-2. 文字コードガード（任意だが推奨）

ステージ前に確認：

powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-utf8-no-bom.ps1 -Changed


ステージ後に確認：

powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-utf8-no-bom.ps1 -Staged

7) コミット → push → PR
cd C:\laragon\www\osikatu
git add -A
git commit -m "<type(scope)>: <summary>"
git push -u origin HEAD


gh が使える場合：

gh pr create --base main --head <branch> --title "..." --body "..."

8) PR本文テンプレ（必須）
Summary

（1〜2行で何をしたか）

Changes

（箇条書きで変更点）

（主要ファイル名）

Tests (facts only)

npm run lint: ✅/❌（ログがあれば短く）

npm run titles:verify: ✅/❌

php artisan test: ✅/❌

npm run e2e / npm run e2e:ci: ✅/❌

Manual Check

/home: 実施/未実施

/circles/[id]/album: 実施/未実施

/circles/[id]/chat: 実施/未実施

/circles/[id]: 実施/未実施

Notes / Risks

ポート衝突、環境依存、未検証ポイントなど

9) Codex向け「開始プロンプト」ミニ版（毎回貼る用）

Repoを main 最新に同期し、featureブランチを切る

変更は最小にし、既存仕様を壊さない

テストは最小セットを回し、PR本文に “事実のみ” を記載

判断が必要なときは STOP して証拠だけ報告


---

## AGENT_RUNBOOK.md に追記するリンク（コピペ）

`docs/AGENT_RUNBOOK.md` の先頭（CODEX_FIRST_PASTE の参照付近）に、次の1行を追加してください：

```md
- Autonomy + Testing runbook: `docs/CODEX_AUTONOMY_TESTING.md`

実際に repo へ追加して push する手順（PowerShell）

いまのブランチが chore/encoding-guardrails-runbook でもOK（PRに追加コミットされます）。

cd C:\laragon\www\osikatu

# 1) 新規doc作成（上の内容を貼り付けて保存）
notepad docs\CODEX_AUTONOMY_TESTING.md

# 2) AGENT_RUNBOOK.md にリンク1行追加
notepad docs\AGENT_RUNBOOK.md

# 3) 変更確認
git status -sb
git diff

# 4) BOMチェック（推奨）
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-utf8-no-bom.ps1 -Changed

# 5) commit & push
git add docs\CODEX_AUTONOMY_TESTING.md docs\AGENT_RUNBOOK.md
git commit -m "docs: add Codex autonomy + testing runbook"
git push

補足（あなたの今の状態に対して）

git status -sb が clean なので、上の追加は安全に進められます。

PRがすでに作られていても、同じブランチに push すれば PRは自動更新されます。

必要なら次に、**「Playwrightが落ちたときの原因別チェックリスト」**を docs に追加する版（ログ保存・traceの取り方込み）も作れます。

