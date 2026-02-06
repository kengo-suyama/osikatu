# Todos

This file is a lightweight backlog and status note.

## Done (Merged To main)

- PR-0 `feature/oshi-actions-pool` (#3): base (59 files)
- PR-A `feature/plan-entitlements` (#4): Entitlements (DTO + controller)
- PR-C `feature/album` (#5): album testids, E2E, MediaController quota
- PR-D `feature/chat-stamp-media` (#6): chat testids, E2E
- PR-E `feature/announcement` (#7): circle home announcement, E2E
- PR-F `feature/final-polish` (#8): home budget fix, invite gate/navigation E2E
- Encoding guardrails:
  - Stripped UTF-8 BOM from PHP/migration files (prevents stray output like `﻿Laravel ...`).
  - Added `.editorconfig` (`charset=utf-8`) and `tools/check-utf8-no-bom.ps1`.

## Repo State (2026-02-06)

- `main` is aligned with `origin/main` (no local commits).
- Remaining branches intentionally not merged in this batch:
  - `feature/circle-logs-e2e`
  - `feature/hub-and-quickmode`
  - `feature/suyama`

## Next (Engineering)

- Decide policy for remaining feature branches:
  - Merge, rebase+merge, or close (document the decision).
- Playwright E2E: make `npm run e2e:ci` reliably runnable on dev machines.
  - Currently it requires port `8001` to be free (common collision).
- Backend folder layout: repo contains two Laravel-like trees (`/laravel` and root-level `/app`, `/routes`, `/database`, ...).
  - Decide which is authoritative long-term and remove or clearly deprecate the other.
- Frontend lint warnings cleanup (optional tech debt):
  - React hooks exhaustive deps warnings in several components.
  - `next/no-img-element` warnings: consider migrating to `next/image` where appropriate.
  - Missing `alt` prop warning in `components/chat/CircleChatScreen.tsx`.
