# Todos

This file is a lightweight backlog and status note.

## Done (Merged To main)

- PR-0 `feature/oshi-actions-pool` (#3): base (59 files)
- PR-A `feature/plan-entitlements` (#4): Entitlements (DTO + controller)
- PR-C `feature/album` (#5): album testids, E2E, MediaController quota
- PR-D `feature/chat-stamp-media` (#6): chat testids, E2E
- PR-E `feature/announcement` (#7): circle home announcement, E2E
- PR-F `feature/final-polish` (#8): home budget fix, invite gate/navigation E2E
- PR-3 `feature/home-schedule-summary` (#11): Home upcoming schedule summary card
- PR-4A `feature/home-budget-tz-fix` (#12): budget TZ fix, shared date helpers, data-testid, E2E
- PR-4B `feature/home-expenses-summary` (#13): expenses-by-oshi summary card, expenseRepo, backend ambiguous column fix, E2E
- PR-4C `feature/home-navigation-polish` (#14): budget→/money, expenses→/money, log→/logs navigation links, E2E
- PR #19: fix duplicate expenses-summary testid (strict mode violation)
- Encoding guardrails:
  - Stripped UTF-8 BOM from PHP/migration files (prevents stray output like `﻿Laravel ...`).
  - Added `.editorconfig` (`charset=utf-8`) and `tools/check-utf8-no-bom.ps1`.

## Repo State (2026-02-07)

- `main` is aligned with `origin/main` (no local commits).
- Remaining branches intentionally not merged in this batch:
  - `feature/circle-logs-e2e`
  - `feature/hub-and-quickmode`
  - `feature/suyama`

## E2E Tests (maintenance targets)

| File | Covers |
|------|--------|
| `home-budget.spec.ts` | Budget card visibility, testid elements |
| `home-expenses-summary.spec.ts` | Expenses summary card, API seeding, navigation |
| `home-navigation.spec.ts` | Budget→/money, Expenses→/money, Log→/logs links |
| `home-schedule.spec.ts` | Upcoming schedule card |
| `invite-gate.spec.ts` | Invite gate / navigation |
| `home-log-card.spec.ts` | Log card structure, category badge, empty state |
| `home-log-filter.spec.ts` | Log card filter chips, icon thumbnails, click behavior |

## Backlog (next phase)

| Priority | ID | Theme | Scope |
|----------|----|-------|-------|
| ~~A~~ | home-log-enhance | ~~Home log card: icon thumbnails + category filter chips~~ | **Done** (PR #20) |
| **B** | notifications | Schedule reminders, budget alerts | Medium |
| **C** | log-features | Log: photo upload, tags, search filters | Medium |
| **D** | oshi-profile | Oshi profile: SNS links, memo, anniversaries | Small-Medium |

Recommended next: **A** or **D** (small PRs to raise Home UI completeness).

## E2E Running Guide

### Quick start

```bash
cd frontend
npm run e2e:ci
```

This is the **only supported way** to run E2E tests. It automatically:
1. Sets up a dedicated SQLite DB at `laravel/storage/osikatu-e2e.sqlite`
2. Runs `migrate:fresh` + seeds demo data (`OwnerDashboardDemoSeeder`)
3. Starts backend (`php artisan serve` on port 8001) with `DB_CONNECTION=sqlite`
4. Starts frontend (Next.js dev on port 3103)
5. Locks `.git/HEAD` to prevent IDE auto-checkout during the run
6. Runs Playwright tests

### Prerequisites
- **Ports 3103 and 8001 must be free.** Kill stale processes first:
  ```powershell
  Get-NetTCPConnection -LocalPort 8001 -EA 0 | % { Stop-Process -Id $_.OwningProcess -Force }
  Get-NetTCPConnection -LocalPort 3103 -EA 0 | % { Stop-Process -Id $_.OwningProcess -Force }
  ```
- **PHP** must be on PATH (`php artisan` must work from `laravel/` dir).
- **Node.js** 18+ and `npm ci` in `frontend/`.

### Common pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ECONNREFUSED 127.0.0.1:8001` | Backend not running or MySQL not available | Always use `npm run e2e:ci` (uses SQLite). Never run `npx playwright test` directly. |
| `Port 8001 already in use` | Stale artisan serve from previous run | Kill process on port 8001 (see above). |
| `git HEAD changed` exit code 2 | IDE switched branch during test run | Close IDE git auto-checkout or re-run. The wrapper creates HEAD.lock to prevent this. |
| `ECONNRESET` mid-run | artisan serve crashed (Windows process stability) | Re-run. Usually passes on retry. |

### Important: MySQL is NOT needed for E2E
The `run-e2e-ci.cjs` wrapper overrides `DB_CONNECTION=sqlite`. The `.env` MySQL config is only used for local development with `php artisan serve` (without the wrapper).
## Tech Debt (Engineering)

- Decide policy for remaining feature branches:
  - Merge, rebase+merge, or close (document the decision).
- ~~Playwright E2E: make `npm run e2e:ci` reliably runnable on dev machines.~~ Resolved: see E2E Running Guide above.
- Backend folder layout: repo contains two Laravel-like trees (`/laravel` and root-level `/app`, `/routes`, `/database`, ...).
  - Decide which is authoritative long-term and remove or clearly deprecate the other.
- Frontend lint warnings cleanup (optional tech debt):
  - React hooks exhaustive deps warnings in several components.
  - `next/no-img-element` warnings: consider migrating to `next/image` where appropriate.
  - Missing `alt` prop warning in `components/chat/CircleChatScreen.tsx`.