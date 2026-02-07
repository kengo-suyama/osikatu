# Next.js spawn EPERM 対応 Runbook（osikatu）

## 目的
Phase 2–4（非破壊 + 証拠取り + 最小再現）を実行し、Phase 4 の結果報告で停止するための手順テンプレ。

---

## 0) 共通ルール（必読）
- 実行シェル: PowerShell
- 破壊的操作は禁止: Stop-Process / taskkill / rm -rf / Remove-Item / キャッシュ削除 / .env 編集 / package.json 編集 / npm install 等
- 旧式 WMI CLI コマンドは禁止
- 変更禁止（原則）: Repo ファイルは編集しない。ログ採取のみ
- 例外でファイル変更が入っていたら allowlist を最初に確認し、allowlist 外があれば即停止

Allowlist（例。必要なら更新可）
- docs/next-spawn-eperm-runbook.md のみ

---

## Phase 2: 非破壊で PID / コマンドライン同定（ポート起点）

### 2-0) allowlist 確認（非破壊）
```powershell
cd C:\laragon\www\osikatu
git status -s
git diff --name-only
```

判定
- 差分がある場合、それが allowlist のみか確認する
- allowlist 外が出たら 以降は一切実行せず停止

### 2-1) 文字化け対策（非破壊）
```powershell
chcp 65001 | Out-Null
```

### 2-2) 重要ポートの PID を特定（非破壊）
```powershell
netstat -ano | findstr ":3103"
netstat -ano | findstr ":8001"
netstat -ano | findstr ":3000"
```

### 2-3) PID → プロセス基本情報（非破壊）
```powershell
# 例: $pids = @(12345, 23456)
$pids = @(<PID>, <PID>)
$pids | ForEach-Object {
  "---- PID=$_"
  Get-Process -Id $_ -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path
}
```

### 2-4) PID → コマンドライン（管理者なら取れる / 取れない場合はエラーを証拠として残す）
```powershell
$pids = @(<PID>, <PID>)
$pids | ForEach-Object {
  "---- PID=$_"
  try {
    Get-CimInstance Win32_Process -Filter "ProcessId=$_" |
      Select-Object ProcessId,CommandLine | Format-List
  } catch {
    "Get-CimInstance failed: " + $_.Exception.Message
  }
}
```

### 2-5) Node/npm/npx の PATH 混在確認（非破壊）
```powershell
Get-Command node | Format-List Source,Version
Get-Command npm  | Format-List Source,Version
Get-Command npx  | Format-List Source,Version
where.exe node
where.exe npm
where.exe npx
"COMSPEC=" + $env:COMSPEC
npm config get script-shell
```

### Phase 2 レポート（コピペ用）
```
[Phase2: allowlist]
git status -s:
<貼る>
git diff --name-only:
<貼る>

[Phase2: ports->PID]
:3103
<貼る or 出力なし>
:8001
<貼る or 出力なし>
:3000
<貼る or 出力なし>

[Phase2: PID->process]
Get-Process:
<貼る>

[Phase2: PID->commandline]
Get-CimInstance:
<貼る（成功/Access denied含む）>

[Phase2: PATH]
Get-Command / where / COMSPEC / script-shell:
<貼る>
```

### Phase 2 STOP 条件
- allowlist 外差分が出た
- netstat が取れない/異常（この場合も出力を貼って停止）
- Get-CimInstance が Access denied（出力を貼って停止して OK。続きは可）

---

## Phase 3: UI 証拠取り（Defender / CFA / ブロック履歴）
ここは操作ガイド + 記録フォーマットのみ。ファイル変更なし。

### 3-1) UI 証拠取り（Windows セキュリティ）
以下を開いてスクショ（もしくは画面写真）を残す:
- Windows セキュリティ
- ウイルスと脅威の防止 → 保護の履歴
  - node.exe / next / npm / C:\laragon\www\osikatu\frontend が絡むブロックがないか
  - あれば「詳細」まで開いてスクショ
- ランサムウェア防止 → 制御されたフォルダーアクセス (CFA)
  - ON/OFF 状態が分かる画面をスクショ
  - ブロック履歴や最近ブロックされたアプリが見えるならそれも
- サードパーティ AV/EDR があるなら
  - その製品の「検出/隔離/ブロック履歴」画面をスクショ

### 3-2) 追加の非破壊ログ（可能なら）
```powershell
try { Get-MpComputerStatus | Select-Object AMServiceEnabled,AntispywareEnabled,AntivirusEnabled,BehaviorMonitorEnabled,RealTimeProtectionEnabled,IsTamperProtected } catch { $_.Exception.Message }
try { Get-MpThreatDetection | Select-Object -First 20 } catch { $_.Exception.Message }
```

### Phase 3 レポート（コピペ用）
```
[Phase3: UI evidence]
- Protection History screenshots: <yes/no>  (該当があれば要点を1行で)
- CFA status screenshot: <ON/OFF/unknown>
- 3rd party AV/EDR evidence: <yes/no/none>

[Phase3: optional PS logs]
Get-MpComputerStatus:
<貼る or エラー>
Get-MpThreatDetection:
<貼る or エラー>
```

### Phase 3 STOP 条件
- ここまで完了したら次へ進んで OK（破壊的操作はまだしない）

---

## Phase 4: 最小再現（spawn EPERM / wait-on timeout の再現ログ）
目的: **「Next が 3103 で LISTEN できない」「spawn EPERM が出る」**を最小手順で再現し、ログを残す。
注意: この Phase はプロセス起動が含まれるが、停止/削除はしない。

### 4-1) 実行前のポート状況（非破壊）
```powershell
netstat -ano | findstr ":3103"
netstat -ano | findstr ":8001"
netstat -ano | findstr ":3000"
```

### 4-2) 最小再現①: npm 経由で Next dev（ログ取得）
```powershell
cd C:\laragon\www\osikatu\frontend

$env:NEXT_PUBLIC_DATA_SOURCE="api"
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8001"

npm run dev -- -p 3103
```

- spawn EPERM が出たらログ全文を保存
- 起動した場合は別ターミナルで（停止はしない）
```powershell
curl.exe -I http://127.0.0.1:3103/home
netstat -ano | findstr ":3103"
```

### 4-3) 最小再現②: 直叩き（npm 経由ではない）
```powershell
cd C:\laragon\www\osikatu\frontend
node .\node_modules\next\dist\bin\next dev -p 3103
```

### 4-4) 最小再現③: e2e:ci
```powershell
cd C:\laragon\www\osikatu\frontend
npm run e2e:ci
```

期待される観測
- wait-on が ECONNREFUSED → timeout
- その前後に spawn EPERM が出る

### Phase 4 レポート（コピペ用）
```
[Phase4: precheck ports]
:3103
<貼る>
:8001
<貼る>
:3000
<貼る>

[Phase4: repro1 npm run dev -p 3103]
<ログ全文（spawn EPERM / Ready / EADDRINUSE 等）>

[Phase4: repro2 direct node next dev -p 3103]
<ログ全文>

[Phase4: repro3 npm run e2e:ci]
<ログ全文（wait-onの挙動含む）>

[Phase4: postcheck ports]
:3103
<貼る>
:8001
<貼る>
:3000
<貼る>

[Phase4: residual processes (non-destructive)]
※PID 特定だけ（停止はしない）
netstat -ano | findstr ":3103"
netstat -ano | findstr ":8001"
netstat -ano | findstr ":3000"
```

### Phase 4 実施後の STOP 宣言
Phase 4 レポートを貼ったらここで STOP。

次にやるべき候補（実行はしない）
- A) 破壊的（PID 停止 / .next 削除）を明示許可取りして Phase 5 へ
- B) Defender/CFA 除外追加（明示許可）で再実行
- C) 3000 常駐 Next の運用ルール化（Runbook へ反映）

---

## 追加: 明日開始の最短ルート（おすすめ順）
- Phase 2（PID 同定）→ ポート占有と常駐（3000/8001）を事実で固定
- Phase 3（UI 証拠取り）→ CFA/Defender 起因の可能性を潰す/裏付ける
- Phase 4（最小再現）→ spawn EPERM / wait-on timeout の再現ログを確定
- ここで止めて、次アクションに許可を取りに行く（破壊的/除外追加）

---

## 新ツール（自動診断・自動復旧）

### e2e:preflight — ポート事前チェック
E2E で使用するポート (3103, 8001) が空いているか IPv4 + IPv6 で確認します。
Windows では既知プロセス (node.exe, php.exe, cmd.exe) を自動で kill して再チェックします。

```powershell
cd C:\laragon\www\osikatu\frontend
npm run e2e:preflight
```

### e2e:doctor — 環境診断
ランタイム (Node/npm/PHP)、ポート、git lock、SQLite DB、依存関係、Playwright ブラウザ、conflict marker を一括チェックします。

```powershell
cd C:\laragon\www\osikatu\frontend
npm run e2e:doctor
```

出力例:
```
🩺 E2E Doctor — Diagnosing test environment...

1) Runtime
  ✅ Node.js v20.x.x
  ✅ npm 10.x.x
2) PHP
  ✅ PHP 8.x.x
3) Ports
  ✅ Port 3103 is free (IPv4 + IPv6)
  ✅ Port 8001 is free (IPv4 + IPv6)
...
🩺 Results: 12 passed, 0 warnings, 0 failed
   Environment looks good! 🎉
```

### run-e2e-ci.cjs 自動復旧機能
- **再入ガード**: 同時に2つの run-e2e-ci が起動するのを防止
- **SQLite 破損復旧**: `malformed` / `corrupt` エラー検出時に DB を再作成
- **preflight 統合**: 起動前に自動で ensure-ports-free を呼び出し
- **uncaughtException / unhandledRejection**: 予期しないクラッシュでもロックを確実に解放