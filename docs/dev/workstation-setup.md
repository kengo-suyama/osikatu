# Workstation Setup (Windows / Laragon)

目的: 新PC/別端末でも同じ安全策を再現し、「不安定checkout/pull --rebase」の被害を最小化して切り分けを進められる状態にする。

## 1) Clone 後の最短セットアップ

```powershell
cd C:\laragon\www\osikatu
git status -sb
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

## 4) VSCode を “拡張なし + クリーンプロファイル” で起動（切り分け用）

```powershell
cd C:\laragon\www\osikatu
pwsh -File scripts\code-clean.ps1
```

## 5) 不安定checkout 再発時の即応（証拠採取）

playbook: `docs/dev/unstable-checkout-playbook.md`

最低限:
- `git reflog` 抜粋を保存してから復旧する
- 再発した“瞬間”に `Get-Process` / `Win32_Process.CommandLine` を保存する

決定打:
- Procmon で `git.exe` の `Process Create` を捕まえて parent process を特定する

