# Codex Long Task: Windows E2E Stability (Osikatu)

This document is an instruction sheet for Codex to operate autonomously on the Windows (Laragon) E2E stabilization program, including PR handling and merging.

## Scope
- Repo: `kengo-suyama/osikatu`
- Target environment: Windows + Laragon (local E2E)
- Primary user goal: developers can run `cd frontend && npm run e2e:ci` without thinking.

## Non-Negotiable Safety Policy
- Auto-kill only for **known-safe** listeners with **repo-derived evidence**.
- Unknown listeners: never kill.
  - Print PID and CommandLine (when possible).
  - Fail fast with next-step instructions.
- `CI=true` must disable killing by default (forced).
- Never widen kill conditions using ambiguous heuristics.

## Current PR (as of 2026-02-08)
- PR: `#43` `fix(e2e): stabilize Windows preflight + sqlite self-heal + doctor`
- Base: `main`
- Head: `fix/e2e-windows-stability-doctor`
- Evidence:
  - `cd frontend && npm run e2e:ci -- --repeat 1` => 37 passed
  - Logs:
    - `frontend/logs/e2e-stability_20260208_091104.log`
    - `frontend/logs/e2e-pr-repeat1_20260208_093909.log`

## Operating Procedure (Codex)

## 1) Keep Branch Up To Date
Run from repo root:
```powershell
git fetch origin
git switch fix/e2e-windows-stability-doctor
git pull --ff-only
git status -sb
```

## 2) Pre-PR Checks (must pass)
Diff + hygiene:
```powershell
git fetch origin main
git diff origin/main...HEAD --stat
git grep -n "<<<<<<<\|=======\|>>>>>>>" -- . ":!docs/CODEX_LONG_TASK_WINDOWS_E2E.md"
git diff --check origin/main...HEAD
```

Local verification:
```powershell
cd frontend
npm run tools:test
npm run e2e:doctor
npm run e2e:ci -- --repeat 1
```

CI-mode safety verification (must not kill):
```powershell
cd frontend
$env:CI="true"
npm run e2e:preflight
Remove-Item Env:\CI -ErrorAction SilentlyContinue
```

## 3) PR Handling
- Keep PR body aligned with the latest behavior and evidence logs.
- If reviewers ask for safety tightening, default to "make kill rules stricter", not broader.
- If CI (GitHub Actions) is not configured / checks are not reported:
  - Add a PR comment clarifying that local evidence is attached (commands + log filenames).
  - Do not claim CI is green.

## 4) Merge Policy (Codex is allowed to merge)
Merge only when ALL apply:
- No open review-blocking comments.
- Required checks (if any) are green.
- Safety policy is still intact (no unknown kill; CI kill disabled).

Preferred merge method:
- Squash merge (keep `main` history readable).

GitHub CLI merge (example):
```powershell
gh pr merge 43 --repo kengo-suyama/osikatu --squash --delete-branch=false
```

If branch protection requires checks/reviews, satisfy them first.

## 5) Post-Merge
```powershell
git switch main
git pull --ff-only
```

Optionally confirm PR head branch is not needed before deleting it.

## 6) Rollback Plan
Tooling/docs PRs are safe to revert:
```powershell
git switch main
git revert <merge_commit_sha> -m 1
git push origin main
```
