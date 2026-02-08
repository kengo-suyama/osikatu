# Unstable Checkout Playbook (Windows / Laragon)

目的: 「勝手に `git pull --rebase` / `checkout` が走る」「VSCodeが落ちる」などの不安定要因が出たときに、被害を最小化しつつ証拠を揃えて切り分けを進める。

## 0) 最優先: main を基準点に整流化

```powershell
cd C:\laragon\www\osikatu
Test-Path .git\index.lock
git switch main
git fetch origin --prune
git reset --hard origin/main
git status -sb
git log -3 --oneline
```

期待値:
- `## main...origin/main`
- working tree clean

## 1) 症状のメモ（短くでOK）

- いつから/どの操作の直後か（例: VSCode起動直後、lint後、E2E後）
- 何が起きたか（例: ブランチが勝手に切り替わった、pull --rebase の痕跡が出た）
- 直前に触っていたツール（例: VSCode / GitHub Desktop / ターミナル常駐 / 別エージェント）

## 2) まず証拠: reflog で「事実」を押さえる

```powershell
cd C:\laragon\www\osikatu
git reflog --date=iso | Select-String -Pattern "checkout|switch|reset|merge|pull|rebase" | Select-Object -First 50
```

ポイント:
- `pull --rebase ... (start): checkout ...` が出るなら「rebase が checkout を伴って動いた」事実が残る
- まず `reflog` を保存してから復旧する（ログが流れる前に）

## 3) 再発した“瞬間”のプロセス証拠（犯人特定に効く）

再発した瞬間に実行:

```powershell
Get-Process | Where-Object { $_.ProcessName -match "code|vscode|git|gh|github|sourcetree|fork|tower|tortoise|node|pwsh" } |
  Sort-Object CPU -Desc | Select-Object -First 30
```

推奨: `./_evidence/` に `yyyymmdd_hhmmss_process.txt` として保存（ローカルのみ、コミットしない）。

## 3.5) git.exe 起動の親プロセスを自動で記録（WMI監視）

Procmon を開けない状況でも、`git.exe` の起動イベントを `_evidence/` に自動記録できます。
ログには**親プロセス + 祖父プロセス**の Name/CommandLine が含まれます。

### Observe モード（既定）

```powershell
cd C:\laragon\www\osikatu
pwsh -File scripts/capture-git-parent.ps1 -Start -PollMs 20
```

### Deny モード（重要作業中）

`pull --rebase` と `rebase` をブロックします。ブロック時に `snapshot-proc.ps1` も自動実行されます。

```powershell
pwsh -File scripts/capture-git-parent.ps1 -Start -Mode Deny -PollMs 20
```

手動で rebase を通したい場合の逃げ道:

```powershell
$env:ALLOW_GIT_REBASE="1"
git pull --rebase origin main
Remove-Item Env:ALLOW_GIT_REBASE
```

### 停止 / 状態確認

```powershell
pwsh -File scripts/capture-git-parent.ps1 -Stop
pwsh -File scripts/capture-git-parent.ps1 -Status
```

### ログ形式

`_evidence/git_watch_YYYYMMDD_HHMMSS.jsonl`（1行1イベントの JSONL）

各イベントに含まれる主要フィールド:
- `ts`, `pid`, `commandLine`, `actionTag`
- `parentName`, `parentCommandLine`
- `grandParentPid`, `grandParentName`, `grandParentCommandLine`
- `mode` (Observe / Deny)

actionTag 例: `PULL_REBASE`, `REBASE`, `CHECKOUT`, `SWITCH`, `FETCH`, `STATUS`, `OTHER`, `BLOCKED`

注意:
- `git.exe` を起動しないツール（libgit2等）には効きません。
- WMIのイベント購読が権限不足で失敗する場合があります。その場合は自動で polling へフォールバックします（ログに `mode: poll_fallback` が出ます）。

## 3.6) 事件発生時のワンショット証拠収集

```powershell
pwsh -File scripts/snapshot-proc.ps1
```

`_evidence/snapshot_YYYYMMDD_HHMMSS.txt` に以下を保存:
- git/Code/pwsh/node/php の実行中プロセス一覧（PID, PPID, CommandLine）
- git reflog（直近30件）
- .git/guard.log（末尾50行）
- git status

## 3.7) guard.log と watch.jsonl の使い分け

| ログ | 視点 | 分かること |
|------|------|-----------|
| `.git/guard.log` | Git フック | checkout/rebase の発生時刻と結果（BLOCK/ALLOW） |
| `_evidence/git_watch_*.jsonl` | OS プロセス | git.exe を起動した親/祖父プロセス名とコマンドライン |
| `_evidence/snapshot_*.txt` | スナップショット | 事件発生時点の全プロセス状態 |

犯人特定の手順:
1. まず `guard.log` で「いつ checkout/rebase が起きたか」を確認
2. 同時刻の `watch.jsonl` を grep して「誰が git.exe を起動したか」を特定
3. 必要に応じて `snapshot_*.txt` で当時のプロセスツリーを確認

## 4) VSCode クラッシュ（fileWatcher など）を疑う場合

見る場所:
- Crashpad: `%APPDATA%\Code\Crashpad\reports`
- Logs: `%APPDATA%\Code\logs`
- Event Log: `Get-WinEvent`（Application / Code.exe 関連）

よくある痕跡:
- `UtilityProcess ... type: fileWatcher ... crashed with code -1073741819`

## 5) 切り分け: 拡張なし / クリーンプロファイル

```powershell
code --disable-extensions "C:\laragon\www\osikatu"
```

より強い切り分け:

```powershell
code --disable-extensions --user-data-dir "%TEMP%\vscode-osikatu-clean" "C:\laragon\www\osikatu"
```

## 6) 被害最小化: Git Guard（任意・ローカル）

git CLI の `rebase` を `main` 上でブロックするフック（GUIツールは無視する場合あり）:
- `docs/dev/git-guard.md`
