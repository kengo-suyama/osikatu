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

開始:

```powershell
cd C:\laragon\www\osikatu
pwsh -File scripts/capture-git-parent.ps1 -Start
```

より取りこぼしを減らす（poll fallback 時）:

```powershell
pwsh -File scripts/capture-git-parent.ps1 -Start -PollMs 20
```

停止:

```powershell
pwsh -File scripts/capture-git-parent.ps1 -Stop
```

ログ:
- `_evidence/git_process_create_watch_YYYYMMDD_HHMMSS.log`（JSON lines）

注意:
- `git.exe` を起動しないツール（libgit2等）には効きません。
- WMIのイベント購読が権限不足で失敗する場合があります。その場合は自動で polling へフォールバックします（ログに `mode: poll_fallback` が出ます）。

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
