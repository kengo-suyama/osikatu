# Next.js 起動時 spawn EPERM 再発時切り分け Runbook（osikatu）

目的  
osikatu（frontend）で過去に発生した「Next 起動時 `spawn EPERM` → `wait-on` timeout」を、再発時に最短で切り分け・復旧できるようにする。  
原因断定ではなく「観測に基づく判定フロー」と「再発時チェックリスト（コマンド付き）」を整備する。

前提  
- Repo: osikatu  
- Frontend: `C:\laragon\www\osikatu\frontend`  
- CI ゲート: `cd frontend && npm run ci:gate`（lint + titles:verify + e2e:ci）  
- Node.js v20.20.0 / npm 10.2.3 / Next.js 14.2.6  
- `where npm/npx` は Program Files と Roaming の複数ヒットあり（PATH 混在の可能性）  
- 管理者でないと CIM / `Get-NetTCPConnection` が Access denied になる場合あり  
- 3103 LISTEN は出ることあり（例: PID 16544）、8001 は未使用のことあり  

運用ルール  
- **コミット/プッシュ禁止**  
- **原則コード変更なし（環境/運用で解決）**  
- **破壊的操作（プロセス停止・キャッシュ削除など）は必ず「ユーザー許可後」に実行**  
- 変更が必要な場合は「理由・最小差分・影響範囲」を先に提示し、勝手に変更しない

---

## 1) 再発時チェックリスト（コマンド付き）

### A) 環境情報（比較用）
```powershell
cd C:\laragon\www\osikatu\frontend
Get-Command node | Format-List Source,Version
Get-Command npm  | Format-List Source,Version
Get-Command npx  | Format-List Source,Version
where.exe node
where.exe npm
where.exe npx
"COMSPEC=" + $env:COMSPEC
node -v
npm -v
npx --version
npx next --version
```

### B) ポート/プロセス（※ポート確認は“サーバ起動中”に実施）
```powershell
netstat -ano | findstr LISTEN
netstat -ano | findstr :3103
netstat -ano | findstr :8001
Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path
Get-Process -Name php  -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path
```

管理者 PS でのみ（Access denied 回避）  
```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Select-Object ProcessId,CommandLine | Format-List
Get-CimInstance Win32_Process -Filter "Name='php.exe'" |
  Select-Object ProcessId,CommandLine | Format-List
```

（管理者 PS 推奨）PID → ポート逆引き  
```powershell
$pid = <PID_NUMERIC>
Get-NetTCPConnection -OwningProcess $pid -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,State,OwningProcess
```

### C) 再現試験（差分ゼロ / 破壊的操作あり→必ず許可後）
```powershell
# (許可後) node/npm を停止
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process npm  -ErrorAction SilentlyContinue | Stop-Process -Force

# (許可後) Next キャッシュ削除
cd C:\laragon\www\osikatu\frontend
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# 起動テスト（npm → 直叩き）
npm run dev -- -p 3103
# npm 経由が落ちたら直叩き:
node .\node_modules\next\dist\bin\next dev -p 3103
```

### D) wait-on 観点（ci:gate で詰まる場合）
```powershell
curl.exe -I http://127.0.0.1:3103/home
$env:DEBUG="wait-on*"
npm run ci:gate
```

### E) E2E 単体（必要時）
```powershell
cd C:\laragon\www\osikatu\frontend
$env:E2E_BASE_URL="http://127.0.0.1:3103"
$env:PLAYWRIGHT_API_BASE="http://127.0.0.1:8001"
npx playwright test circle-logs-permission.spec.ts --reporter=line
```

### F) preflight「3103使用中」の解消手順（PID指定で安全に）
※停止は**ユーザー許可後のみ**。`node` 全体 kill はしない。  

A) まず PID を特定（非破壊）  
```powershell
netstat -ano | findstr :3103
Get-NetTCPConnection -LocalPort 3103 -ErrorAction SilentlyContinue |
  Select LocalAddress,LocalPort,State,OwningProcess
```

B) コマンドライン確認（管理者なら）  
```powershell
Get-CimInstance Win32_Process -Filter "ProcessId=<PID>" |
  Select ProcessId,CommandLine | Format-List
```

C) 停止（破壊的 → ユーザー許可後のみ）  
```powershell
Stop-Process -Id <PID> -Force
```

D) 再確認  
```powershell
netstat -ano | findstr :3103
cd C:\laragon\www\osikatu\frontend
npm run ci:gate
```

---

## 1b) 5分で回す短縮版チェックリスト
1. `Get-Command node/npm/npx` と `where node/npm/npx` で PATH 混在を確認  
2. `npm run dev -- -p 3103` が `EPERM` かどうか確認  
3. `node .\node_modules\next\dist\bin\next dev -p 3103` が通るか確認  
4. `curl.exe -I http://127.0.0.1:3103/home` のステータス確認  
5. `netstat -ano | findstr :3103` で LISTEN と PID を把握  

---

## 2) 観測ベースの判定フロー（断定しない）

### A) `npm run dev` だけ EPERM、`node ...\next dev` は OK
→ `npm`/`npx` shim（`.cmd`）・PATH 混在・`COMSPEC` 経由 spawn 差を疑う  
確認ポイント:  
- `Get-Command npm/npx` の `Source`  
- `where npm/npx` の順序  
- **管理者で同じコマンドが通るか**

### B) `npm run dev` も直叩きも EPERM
→ Defender/AV/CFA/EDR の「プロセス生成ブロック」が濃厚  
確認ポイント:  
- Windows セキュリティ「保護の履歴」  
- CFA（制御されたフォルダーアクセス）ON/OFF とブロック履歴  
- サードパーティ AV/EDR のログ  
- 例外に `frontend` フォルダと `node.exe` を追加して改善するか

### C) Next は起動するが `wait-on` がタイムアウト
→ `/home` が 2xx を返していない（500/404）か初回コンパイルが遅い  
確認ポイント:  
- `curl -I /home` のステータス  
- Next ログで `/home` のコンパイル時間  
- 必要なら `wait-on` timeout 延長（**変更が必要なら最小差分案を先に提示**）

### D) 管理者で通る / 通常で落ちる
→ 権限/セキュリティ制限が濃厚（CFA/EDR/実行制限）

---

## 3) 収集ログ項目テンプレ（コピペ用）
```
[Env]
node: <node -v>
npm: <npm -v>
npx: <npx --version>
next: <npx next --version>
Get-Command node: <Source, Version>
Get-Command npm: <Source, Version>
Get-Command npx: <Source, Version>
where node: <paths>
where npm: <paths>
where npx: <paths>
COMSPEC: <echo $env:COMSPEC>

[Ports/Process]
netstat LISTEN: <netstat -ano | findstr LISTEN>
netstat 3103: <netstat -ano | findstr :3103>
netstat 8001: <netstat -ano | findstr :8001>
Get-Process node: <Id, Path>
Get-Process php: <Id, Path>
(管理者なら) CIM node: <ProcessId, CommandLine>
(管理者なら) Get-NetTCPConnection: <LocalPort list>

[Repro]
npm run dev -- -p 3103:
<full output>
node node_modules\next\dist\bin\next dev -p 3103:
<full output>
curl -I http://127.0.0.1:3103/home:
<status>

[Security]
Defender protection history: <blocked yes/no + details>
CFA enabled?: <yes/no>
AV/EDR: <product + block logs?>
```

---

## 3b) Allowlist（許容差分）運用
最初に **allowlist を宣言**してから作業を開始する。  

例（コピペ用）:
```
Allowlist:
  - README.md
  - docs/next-spawn-eperm-runbook.md
判定:
  - git diff --name-only の出力が allowlist のみなら続行
  - それ以外が出たら停止して報告
```

---

## 4) 破壊的操作の原則
以下は **必ずユーザー許可後** に実行すること。  
- `Stop-Process` での `node`/`npm` 停止  
- `.next` / `node_modules\.cache` の削除  

---

## 5) 変更が必要な場合の扱い
環境や運用で解決できない場合のみ変更を検討する。  
**変更が必要なら必ず「理由・最小差分・影響範囲」を先に提示**し、許可を得てから実施する。
