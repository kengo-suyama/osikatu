# Agent Runbook (Coding + Testing)

This doc is a practical checklist for continuing development autonomously.
Project rules live in `AGENTS.md` (DTO fixed, repo-layer only for data access, UTF-8 NO BOM).

For a Japanese "first paste" instruction block, see `docs/CODEX_FIRST_PASTE.md`.

## Repo Snapshot (As Of 2026-02-06)

- Default branch: `main`
- Latest commits (top):
  - `b28266e` fix(home): remove duplicate spent input + invite gate/navigation E2E (#8)
  - `86c4168` feat(announcement): display on circle home + manager delete (#7)
  - `43e5926` feat(chat): add data-testid for stamp/media + E2E test (#6)
  - `4e24fac` feat(album): add quota/video restriction + E2E test + testids (#5)
  - `2b23148` feat(plan): add Entitlements service + quotas/features in API (#4)
  - `ec4f275` feat(oshi): actions pool + idempotent completion + shared JSON (#3)
- Remaining feature branches (scope-out per last report):
  - `feature/circle-logs-e2e`
  - `feature/hub-and-quickmode`
  - `feature/suyama`
- Note: the repo currently contains two Laravel-like trees (`/laravel` and root-level `/app`, `/routes`, `/database`, ...).
  - Treat `/laravel` as the backend root (per `AGENTS.md`).

## Daily Workflow

1. Confirm clean state:
   - `git status -sb`
2. Pull latest `main` and branch:
   - `git switch main`
   - `git pull`
   - `git switch -c feature/<topic>`
3. Implement changes with the project constraints:
   - Frontend: no direct `fetch()` in UI; use `frontend/lib/repo/*`.
   - Backend: responses are camelCase and wrapped in the fixed envelope.
   - DTO shapes: if backend DTO changes, update `frontend/lib/types.ts` in the same PR.
4. Run quick verification (see below).
5. Keep diffs small; one feature per PR.

Note: the GitHub repo enforces "changes must be made through a pull request" (direct `main` push is rejected).

## How To Run (Dev)

### Frontend (Next.js)
```powershell
cd C:\laragon\www\osikatu\frontend
npm run dev
```

### Backend (Laravel API)
```powershell
cd C:\laragon\www\osikatu\laravel
php artisan serve --host=127.0.0.1 --port=8000
```

### Frontend in API mode (local dev)
```powershell
cd C:\laragon\www\osikatu\frontend
set NEXT_PUBLIC_DATA_SOURCE=api
set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
npm run dev
```

## Test Commands (Frontend)

From `C:\laragon\www\osikatu\frontend`:

- Lint:
  - `npm run lint`
- Title generation consistency:
  - `npm run titles:verify`
- E2E (Playwright, local):
  - `npm run e2e`
- CI gate (lint + titles + E2E with booted servers):
  - `npm run ci:gate`
- CI gate with logs:
  - `npm run ci:gate:log`

### E2E CI Ports

`npm run e2e:ci` uses:
- Frontend: `127.0.0.1:3103`
- Backend: `127.0.0.1:8001`

If it fails with ports in use, identify the PID:
```powershell
netstat -ano | findstr :8001
```
Then inspect the process:
```powershell
Get-Process -Id <PID>
```

Known collision: XAMPP (or other local PHP) sometimes binds `127.0.0.1:8001`.

## Test Commands (Backend)

From `C:\laragon\www\osikatu\laravel`:

- Laravel tests:
  - `php artisan test`
- Composer script wrapper:
  - `composer test`

## README Update Rule

`README.md` is generated from `docs/README.template.md`.

- Update `docs/README.template.md`
- Regenerate:
  - `npm run readme:gen` (run at repo root)

Note: a git `pre-commit` hook also runs `npm run readme:gen`.

## Encoding Guard (UTF-8 NO BOM)

This repo must never contain UTF-16 / Shift-JIS / UTF-8 with BOM.

- Editor: `.editorconfig` enforces `charset = utf-8`.
- Script: `tools/check-utf8-no-bom.ps1` (see below).
  - This was added because BOM at the start of PHP files can emit stray output before headers.

Suggested preflight before commit:
```powershell
cd C:\laragon\www\osikatu
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-utf8-no-bom.ps1 -Staged
```
