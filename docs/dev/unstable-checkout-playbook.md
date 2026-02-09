# Unstable Checkout Playbook

## Problem
Something in the environment aggressively reverts uncommitted file changes.
Files written by tools (Edit, Write, Node.js scripts) are silently reverted
between tool calls.

## Symptoms
- `git status` shows clean after you just wrote files
- Edits disappear after switching tool calls
- New files vanish between commands

## Workaround: Atomic Write + Stage

Use a Node.js scratchpad script that writes files **and** stages them
in the same process:

```javascript
import fs from "fs";
import { execSync } from "child_process";

function writeAndStage(filePath, content) {
  fs.writeFileSync(filePath, content, { flush: true });
  execSync(`git add "${filePath}"`, { cwd: "c:/laragon/www/osikatu" });
}
```

## Repo Exclusive Lock

To prevent accidental `checkout`, `reset`, or `commit` by other processes:

### Acquire lock (before starting work)
```powershell
pwsh -File .\scripts\repo-lock.ps1 acquire -Owner "Claude"
```

### Check lock status
```powershell
pwsh -File .\scripts\repo-lock.ps1 status
```

### Release lock (after work is done)
```powershell
pwsh -File .\scripts\repo-lock.ps1 release
```

## Guard (Background Watchdog)

Run in a separate terminal to detect unexpected changes:

```powershell
pwsh -File .\scripts\repo-guard.ps1 -RepoPath "C:\laragon\www\osikatu" -IntervalSec 5
```

Short test run (10 seconds):
```powershell
pwsh -File .\scripts\repo-guard.ps1 -RepoPath "C:\laragon\www\osikatu" -IntervalSec 2 -DurationSec 10
```

Guard logs are stored in `.git/guard-logs/`.

## CRLF Notes
- Frontend `.ts`/`.tsx` files: CRLF
- Backend `.php` files: LF
- When doing string replacement via Node.js, normalize to LF for matching,
  then restore CRLF for frontend files.
