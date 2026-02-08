# Git Guard (Rebase/Main + Checkout Log)

This repo can optionally install repo-tracked git hooks to reduce damage from accidental or automated history edits on `main`.

## What It Does

- Blocks `git rebase` when the current branch is `main`
  - Override: set `ALLOW_REBASE_MAIN=1` for a one-off rebase
- Logs checkout events to a local file:
  - `.git/guard.log` (local-only, never committed)

## Install (Local Only)

Run:

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

## Limitations

- Git hooks run for the git CLI. Some GUI tools use different engines and may ignore hooks.
- This does not prevent `git pull --rebase` on other branches.

