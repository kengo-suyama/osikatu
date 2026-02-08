# Git Guard (Rebase/Main + Checkout Log)

This repo can optionally install repo-tracked git hooks to reduce damage from accidental or automated history edits on `main`.

## What It Does

- Blocks `git rebase` when the current branch is `main`
- Blocks `git pull --rebase` even when HEAD is temporarily detached (via `GIT_REFLOG_ACTION` detection)
- Override: set `ALLOW_REBASE_MAIN=1` for a one-off rebase
- Logs all rebase attempts (BLOCK/ALLOW) to `.git/guard.log` (local-only, never committed)

## Install (Local Only)

```powershell
cd C:\laragon\www\osikatu
pwsh -File scripts\setup-githooks.ps1
```

Confirm:

```powershell
git config --local --get core.hooksPath
# expected: .githooks
```

## Test (Safe)

On `main`, try:

```powershell
git switch main
git rebase origin/main
```

Expected: it is blocked and you see a message about `ALLOW_REBASE_MAIN`.

To allow once:

```powershell
$env:ALLOW_REBASE_MAIN="1"
git rebase origin/main
Remove-Item Env:ALLOW_REBASE_MAIN
```

## Parent Process Monitoring

To capture the process that spawns unexpected `git.exe` calls:

```powershell
pwsh -File scripts\capture-git-parent.ps1
```

Leave running in a separate terminal. When `git.exe` is spawned,
it logs the parent process name and command line to `_evidence/`.

## Limitations

- Git hooks run for the git CLI. Some GUI tools use different engines and may ignore hooks.
- The WMI/CIM monitor requires an elevated or admin PowerShell session on some systems.
