# Workstation Setup (Windows / Laragon)

目的: 新PC/別端末でも「環境構築→安全運用→UI確認→トラブル復旧」が迷わず1ページで回る。

## 1) Clone 後の最短セットアップ

```powershell
cd C:\laragon\www\osikatu
git status -sb
```

## 1.5) UIをローカルで見る

### Backend (Laravel)

```powershell
cd C:\laragon\www\osikatu\laravel
composer install
cp .env.example .env   # 初回のみ
php artisan key:generate  # 初回のみ
php artisan migrate
php artisan serve --port=8000
```

Laragon の Apache を使う場合はポートを確認（既定 80）。

### Frontend (Next.js)

```powershell
cd C:\laragon\www\osikatu\frontend
npm install
npm run dev -- --port 3001
```

### ブラウザで確認

- http://localhost:3001/home
- 初回は /onboarding/profile にリダイレクトされるのは正常（オンボーディング）
- API モードで動かす場合:

```powershell
cd C:\laragon\www\osikatu\frontend
$env:NEXT_PUBLIC_DATA_SOURCE="api"
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
npm run dev -- --port 3001
```

## 1.6) "見れない"時の即チェック

### ERR_CONNECTION_REFUSED

```powershell
netstat -ano | findstr :3001
netstat -ano | findstr :8000
```

- ポートが使われていない → サーバーが起動していない。ターミナルのエラーを確認。
- EADDRINUSE → 既にプロセスが占有。`taskkill /PID <PID> /F` で解放。

### EPERM / .next 関連エラー

Next.js の .next ディレクトリが壊れることがあります（Windows Defender/AV干渉）。

```powershell
# 1. まず node/Next を止める（Ctrl+C またはターミナルを閉じる）

# 2. .next を削除
cd C:\laragon\www\osikatu\frontend
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# 3. 再起動
npm run dev -- --port 3001
```

それでもダメなら:
- Windows Defender の除外に `C:\laragon\www\osikatu\frontend` を追加
- `node_modules` も削除して `npm install` からやり直す

### php artisan serve が起動しない

```powershell
# PHP バージョン確認
php -v

# .env が無い場合
cd C:\laragon\www\osikatu\laravel
cp .env.example .env
php artisan key:generate
```

## 2) Git Guard（任意・推奨）

`main` 上の rebase をブロックし、checkout を `.git/guard.log` に記録します（ローカルのみ）。

```powershell
cd C:\laragon\www\osikatu
pwsh -File scripts\setup-githooks.ps1
git config --get core.hooksPath
# expected: .githooks
```

詳細: `docs/dev/git-guard.md`

注意:
- hooks は git CLI 向けです。GUIツールが hooks を無視する場合があります。

## 3) main 整流化（事故後の基準点復旧）

破壊的操作を含むので、基本は clean tree 前提。

```powershell
cd C:\laragon\www\osikatu
pwsh -File scripts\main-align.ps1
```

Dry run:

```powershell
pwsh -File scripts\main-align.ps1 -DryRun
```

証拠も保存（ローカルのみ）:

```powershell
pwsh -File scripts\main-align.ps1 -Evidence
```

## 4) VSCode を "拡張なし + クリーンプロファイル" で起動（切り分け用）

```powershell
cd C:\laragon\www\osikatu
pwsh -File scripts\code-clean.ps1
```

## 5) 不安定checkout 再発時の即応（証拠採取）

playbook: `docs/dev/unstable-checkout-playbook.md`

### 常駐監視（推奨）

git.exe の起動を親/祖父プロセス付きで記録します。

```powershell
# Observe モード（ログのみ）
pwsh -File scripts\capture-git-parent.ps1 -Start -PollMs 20

# Deny モード（pull --rebase / rebase をブロック）
pwsh -File scripts\capture-git-parent.ps1 -Start -Mode Deny -PollMs 20

# 停止
pwsh -File scripts\capture-git-parent.ps1 -Stop
```

### 事件発生後のワンショット証拠収集

```powershell
pwsh -File scripts\snapshot-proc.ps1
```

`_evidence/snapshot_*.txt` にプロセス一覧・reflog・guard.log・git status を保存します。

### ログの見方

| ログ | 場所 | 内容 |
|------|------|------|
| guard.log | `.git/guard.log` | checkout/rebase のフック記録 |
| watch.jsonl | `_evidence/git_watch_*.jsonl` | git.exe の親/祖父プロセス |
| snapshot | `_evidence/snapshot_*.txt` | 事件時点の全プロセス |

犯人特定: watch.jsonl の `parentName` / `grandParentName` を確認。

## 6) Pins 移行（デプロイ後の必須手順）

`circle_pins` へ移行した後は、既存の `posts.is_pinned` を backfill しないと過去ピンがUIに出ません。

runbook: `docs/dev/pins-deploy-runbook.md`
