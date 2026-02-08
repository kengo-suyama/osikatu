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
# Observe mode (default): log only
pwsh -File scripts\capture-git-parent.ps1 -Start -PollMs 20

# Deny mode: block pull --rebase and rebase, log + terminate
pwsh -File scripts\capture-git-parent.ps1 -Start -Mode Deny -PollMs 20

# Stop
pwsh -File scripts\capture-git-parent.ps1 -Stop
```

Logs are written to `_evidence/git_watch_*.jsonl` with parent + grandparent process info.

### Escape Hatch (Deny Mode)

To allow a rebase while Deny mode is active:

```powershell
$env:ALLOW_GIT_REBASE="1"
git pull --rebase origin main
Remove-Item Env:ALLOW_GIT_REBASE
```

## Evidence Snapshot

After an incident, capture a full snapshot:

```powershell
pwsh -File scripts\snapshot-proc.ps1
```

Saves process list, reflog, guard.log, and git status to `_evidence/`.

## Limitations

- Git hooks run for the git CLI. Some GUI tools use different engines and may ignore hooks.
- The WMI/CIM monitor requires an elevated or admin PowerShell session on some systems.
