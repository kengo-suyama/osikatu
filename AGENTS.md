# AGENTS.md - Osikatu project rules

## Overview
This repo contains:
- frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + framer-motion
- laravel: Laravel API + MySQL (DTO fixed)

Goals:
- UI is clear and “youth-friendly” (spacious, card-based)
- Data source switchable (localStorage MVP → Laravel API/MySQL)
- DTO shapes are fixed and must not drift
- Encoding issues must never happen again

---

## Working directory (Windows / Laragon)
Project root:  C:\laragon\www\osikatu  
Frontend root: C:\laragon\www\osikatu\frontend  
Backend root:  C:\laragon\www\osikatu\laravel

---

## Repo structure
- /frontend  ... Next.js app
- /laravel   ... Laravel API backend

---

## How to run (local)

### Frontend
```powershell
cd C:\laragon\www\osikatu\frontend
npm install
npm run dev
# http://localhost:3000
Backend (Laravel)
cd C:\laragon\www\osikatu\laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan serve --port=8000
# http://localhost:8000
Environment variables (Frontend)
Create frontend/.env.local:

NEXT_PUBLIC_DATA_SOURCE=local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
localStorage mode (MVP): NEXT_PUBLIC_DATA_SOURCE=local

API mode (Laravel/MySQL): NEXT_PUBLIC_DATA_SOURCE=api

IMPORTANT:

Switching modes must not require UI code changes.

Only repo-layer changes are allowed.

Encoding rule (CRITICAL)
All source files MUST be UTF-8 (NO BOM).

Never generate Shift-JIS / UTF-16 / UTF-8 with BOM.

If any file becomes non-UTF8, re-create it cleanly (do NOT attempt partial fixes).

UI rules
Global:

BottomNav fixed on all pages

Header contains "oshi switcher" + Settings entry

Dark mode supported (next-themes)

Cards have generous spacing, clear hierarchy, not cluttered

Motion duration 0.2 - 0.35 sec by default, not too flashy

Home:

Must show: Oshi card (image), Today summary, Next deadline, Quick actions

Must include “How to use” button (Dialog with short guide)

Settings:

Must include “Home compact mode” switch

Persist to localStorage key: osikatu:home:compact ("true"/"false")

Dispatch event home-compact-change for instant reflect

Celebration effects (Allowed to be flashy on event days only)
We allow special “luxury” effects on:

Oshi birthday (user-selected theme)

Christmas

New Year holidays

Valentine’s Day

White Day

User’s own birthday (if supported)

Any registered anniversaries

Effect themes (user selectable):

Elegant sparkle: gloss + subtle confetti

Idol-live: penlight glow + star particles

Cute: hearts + ribbon-like motion

Default remains subtle. Flashy effects only when isEventDay === true.

Dependencies (Frontend)
Required base packages:

next-themes

lucide-react

framer-motion

chart.js

react-chartjs-2

Radix (required if shadcn components used):

@radix-ui/react-accordion

@radix-ui/react-select

@radix-ui/react-toast

@radix-ui/react-switch

If you see Module not found errors for Radix components, install missing package:

cd C:\laragon\www\osikatu\frontend
npm i @radix-ui/react-accordion
API/DTO rules (CRITICAL)
All API responses MUST be camelCase.

Response envelope is FIXED:

Success:

{ "success": { "data": {}, "meta": {} } }
Error:

{ "error": { "code": "STRING_CODE", "message": "message", "details": {} } }
DTO shapes are fixed and must not drift.

If backend DTO changes, frontend frontend/lib/types.ts must be updated in the same PR.

Laravel recommendation:

Use JsonResource to map snake_case DB columns to camelCase DTO.

Use ApiResponse helper (success/error envelope).

Data layer (Frontend)
All data access goes through repo-layer only:

frontend/lib/repo/*

No direct fetch() inside UI components except via repo calls.

LocalStorage keys:

osikatu:oshis

osikatu:oshi:{id}:profile

osikatu:oshi:{id}:image

osikatu:home:compact

Events for immediate UI sync:

oshi-profile-change

home-compact-change

Git rules
Do not commit:

laravel/vendor

frontend/node_modules

laravel/.env

laravel/storage/* (except keep .gitignore)

Security / npm audit policy
Do NOT run npm audit fix --force automatically.

Prefer targeted dependency upgrades.

If a vulnerability affects Next.js, follow official guidance and upgrade Next.js to a patched version.

PR/Commit guideline
One feature per PR if possible.

Always include:

what changed

how to run

screenshots if UI changed

Definition of Done
Frontend:

npm run dev works without runtime errors

/home renders and navigation works

Settings toggles reflect immediately

Oshi image upload + preview works (localStorage MVP)

Backend:

Laravel API runs and returns camelCase DTO with fixed envelope

MySQL persistence works

Image upload stored in public disk and imageUrl returned


---

## ✅ 保存→Git反映（そのまま実行）
```powershell
cd C:\laragon\www\osikatu
git add AGENTS.md
git commit -m "Add AGENTS rules"
git push