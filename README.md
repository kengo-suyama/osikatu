# Osikatu
推し活の「今」を、映えるフィードに。

> この README は `docs/README.template.md` から自動生成されます。更新後は `npm run readme:gen` を実行してください。

## 概要
- 推し活の記録・支出・予定をまとめるモバイル特化アプリ
- Next.js App Router + Tailwind + shadcn/ui + Framer Motion で構築
- Laravel REST API 連携を前提に拡張

## 採用担当向けの見どころ
- **課金/トライアル設計**: Free/Premium/Plus + 7日トライアルで心理的負担を最小化
- **運営負荷の削減**: OwnerDashboardで未確認/未払い/出欠未回答を一目で把握
- **拡散導線**: 招待コード + SNSテンプレ + 公開サークル検索の循環設計
- **安全設計**: 参加リクエスト（承認制）で若年層向けの安心運営

## Screenshots (390px)
### Home
- 推しヒーロー（画像） + Quick Actions + 供給Tabs + 次の締切 + Moneyスナップ + ミニFeed

![Home](docs/screenshots/home.png)

### Log (SNS)
- 画像付き投稿2件 + テキスト投稿2件 + タグchips + テンプレ投稿ボタン

![Log](docs/screenshots/log.png)

### Money
- 今月残り（大） + カテゴリ（グラフ） + 明細リスト

![Money](docs/screenshots/money.png)

### Schedule
- チケットタイムライン + 次の締切横スクロール

![Schedule](docs/screenshots/schedule.png)

### Settings
- 推し管理（推し切替 / 推しカラー / 画像変更）※MVPはUIだけでもOK

![Settings](docs/screenshots/settings.png)

## Repo structure
- `/frontend` ... Next.js app
- `/laravel` ... Laravel API backend

## Frontend
### 最短セットアップ（Laragon + rewrites）
```powershell
# Laravel (API)
cd C:\laragon\www\osikatu\laravel
composer install
php artisan migrate
php artisan db:seed --class=OwnerDashboardDemoSeeder
php artisan serve --host=127.0.0.1 --port=8000

# Next.js (rewrites)
cd C:\laragon\www\osikatu\frontend
npm install
npm run dev -- -p 3000
```

疎通確認:
```powershell
curl.exe -i http://127.0.0.1:8000/api/circles
curl.exe -i http://127.0.0.1:3000/api/circles
```

### セットアップ（開発サーバ）
```powershell
cd C:\laragon\www\osikatu\frontend
npm install
npm run dev
# http://localhost:3000
```

### データソース切替
- `NEXT_PUBLIC_DATA_SOURCE=local` の場合は localStorage モード（MVP）
- `NEXT_PUBLIC_DATA_SOURCE=api` の場合は Laravel API モード

## Backend
### セットアップ（Laravel）
```powershell
cd C:\laragon\www\osikatu\laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan serve --port=8000
# http://localhost:8000
```

## 環境変数
`frontend/.env.local` を作成:
```env
NEXT_PUBLIC_DATA_SOURCE=local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## DTO / API envelope
### 成功レスポンス
```json
{
  "success": {
    "data": {},
    "meta": {}
  }
}
```

### 失敗レスポンス
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "message",
    "details": {}
  }
}
```

### ルール
- すべて camelCase
- DTO 形状は固定（変更時は `frontend/lib/types.ts` と同時更新）

## Owner Dashboard
### サンプルJSON
```json
{
  "success": {
    "data": {
      "circleId": 1,
      "myRole": "owner",
      "nextDeadline": {
        "kind": "notice",
        "title": "入金期限（○○公演）",
        "at": "2026-02-02T23:59:00+09:00",
        "remainingMinutes": 3210
      },
      "counts": {
        "unconfirmed": 3,
        "unpaid": 2,
        "rsvpPending": 4
      },
      "unconfirmedMembers": [
        { "id": 11, "nickname": "Aoi", "avatarUrl": null, "initial": "A", "role": "member" },
        {
          "id": 12,
          "nickname": "Miki",
          "avatarUrl": "http://localhost:8000/storage/avatars/miki.png",
          "initial": null,
          "role": "member"
        }
      ],
      "unpaidMembers": [
        {
          "member": { "id": 12, "nickname": "Miki", "avatarUrl": null, "initial": "M", "role": "member" },
          "amountYen": 6800
        }
      ],
      "rsvpPendingMembers": [
        { "id": 13, "nickname": "Ren", "avatarUrl": null, "initial": "R", "role": "member" }
      ]
    }
  }
}
```

### デモ用シード & 確認
シード内容（README用）
- Owner（Plus）1名 + Admin 1名 + Member複数
- 重要連絡 / 未確認 / 未払い / 出欠データ
- 公開サークル + 招待コード導線
- サークル内チャット（post_type=chat）サンプル
- 参加リクエスト（承認待ち）サンプル
- ピン投稿の既読/未読サンプル

```powershell
cd C:\laragon\www\osikatu\laravel
composer install
php artisan config:clear
php artisan migrate:fresh
php artisan db:seed --class=OwnerDashboardDemoSeeder
php artisan storage:link
php artisan serve --port=8000
```

#### API 疎通（OwnerDashboard）
```powershell
curl.exe -s -H "X-Device-Id: demo-device-001" http://localhost:8000/api/circles/1/owner-dashboard
```

#### Frontend 確認
```powershell
cd C:\laragon\www\osikatu\frontend
npm install
if (Test-Path .next) { Remove-Item .next -Recurse -Force }
npm run dev
```

ブラウザ: `http://localhost:3000/home`

## サークル導線の確認（個人モード → 検索 → 0件UI → 作成/招待）
```powershell
# Backend
cd C:\laragon\www\osikatu\laravel
php artisan migrate
php artisan db:seed --class=OwnerDashboardDemoSeeder

# Frontend
cd C:\laragon\www\osikatu\frontend
npm run dev
```

1) Home を開く（招待なし）
- 個人モードで利用できることを確認

2) サークルカード → 「サークルを探す」
- 検索ダイアログが開くこと

3) 該当しない条件で検索
- 0件UIが出て「作る / 続ける / 招待」の3択が表示されること

4) 「作る」
- Plus/trial は作成ダイアログ
- Free はガード表示で止まること

5) 「招待」
- 招待コード入力導線へ遷移すること

## テーマと特別背景
- テーマは `シンプル/ナイト/ポップ/ナチュラル/サンセット` が Free で選択可能
- Premium/Plus は `ロック/EDM/クラシック/シティポップ/ヒップホップ` を含む全10テーマ
- Plusのサークルリーダーは「サークルテーマ」を設定でき、サークル内ページでは全メンバーに適用されます
- Plusのサークルリーダーは「フェス背景（花びら・キラキラ）」をON/OFF可能（サークル単位で保存）
- 端末の `prefers-reduced-motion` が有効な場合は動く背景は表示されません

## サークルを広める方法
### 公開サークル参加の流れ（承認制）
- 招待なしでも個人モードで利用できます（ログ/予定/支出/推し管理）
- 公開サークル検索 → 参加リクエスト → 承認で参加できます
- 招待コードで参加した初回ユーザーは 7日トライアルが付与されます
- 参加後は `/circles/{id}/chat` で合流できます（Freeは月30メッセージまで）

### 拡散の手順
1. サークルを作成（Plus）
2. 招待コードをコピー
3. SNSにそのまま投稿

### Instagram / TikTok の手順（コピー→貼り付け）
- Instagram: 共有ボタンでテンプレをコピー → Instagram を開く → 投稿/ストーリーズに貼り付け
- TikTok: 共有ボタンでテンプレをコピー → TikTok を開く → 説明欄に貼り付け

### 推奨テンプレ（アプリ内共有ボタンからコピーできます）
#### 1) 個人向け
```
推し活用にサークル管理アプリ使い始めた🌸 遠征・入金・出欠が全部まとまって助かる…

推し：{{oshiLabel}}
招待コード：{{inviteCode}}

https://osikatu.app
#推し活 #オタ活
```

#### 2) 遠征前
```
遠征班用にサークル作りました✈️ 入金・出欠の管理が一瞬で終わる…

初参加は7日間お試しOK◎
招待コード：{{inviteCode}}

https://osikatu.app
#遠征 #推し活
```

#### 3) 運営者向け
```
サークル運営が楽になるアプリ作りました🌸 未確認・未払いが一目で分かるのが最高。

承認制で安心して使えます◎
招待コード：{{inviteCode}}

https://osikatu.app
#サークル運営 #推し活
```

#### 4) Instagram（短文）
```
推し活の遠征情報まとめてるよ🚄✨「{{circleName}}」参加どうぞ！
招待コード：{{inviteCode}}
https://osikatu.app
#推し活 #遠征
```

#### 5) Instagram（投稿向け）
```
【参加者募集】{{circleName}}
遠征の予定/持ち物/現地情報を共有してます！
招待コード：{{inviteCode}}
参加URL：https://osikatu.app
#推し活 #遠征 #オタ活
```

#### 6) TikTok（説明欄向け）
```
遠征・現地情報を共有する推し活サークル「{{circleName}}」
招待コード：{{inviteCode}}
https://osikatu.app
#推し活 #遠征 #オタ活
```

### 注意
- ハッシュタグは2〜3個まで、URLは末尾に置く
- Freeは参加サークル1つまで（trial中は増えます）
- 個人情報は書かない（操作ログ/テンプレは非PII前提）

## デモ用X投稿テンプレ（採用担当向け）
```
推し活サークル運営のPoCを作りました🌸
入金/出欠/チャット/通知まで一括で管理できます。

デモ: https://osikatu.app
#推し活 #プロダクト開発
```

### 別案（短く刺さる）
```
推し活サークル運営を最小工数にするアプリを作りました。
参加・出欠・入金・チャットまで1画面で完結。

https://osikatu.app
#推し活 #プロダクト開発
```

### 別案（UX強調）
```
Freeで個人モード→招待で7日トライアル→運営はPlus。
押し付けない課金導線まで作り込んだ推し活アプリです。

https://osikatu.app
#推し活 #UX設計
```

## デモ導線（採用担当向け）
- Home → 公開サークル検索 → 参加リクエスト → 承認で参加
- OwnerDashboard → 未確認/未払い/出欠未回答の把握 → 一括リマインド
- 参加後 `/circles/{id}/chat` で合流（Freeは月30メッセージ）

## README 自動生成
### 使い方
```powershell
cd C:\laragon\www\osikatu
node .\scripts\generate-readme.mjs
```

### npm スクリプト
```powershell
cd C:\laragon\www\osikatu
npm run readme:gen
```

### 任意: pre-commit hook（simple-git-hooks）
```powershell
cd C:\laragon\www\osikatu
npm install
npm run hooks:enable
```

無効化:
```powershell
cd C:\laragon\www\osikatu
npm run hooks:disable
```

## トラブルシューティング
- E2E (Windows/Laragon) の復旧手順: `docs/next-spawn-eperm-runbook.md`
- Radix の Module not found エラーが出る場合:
  ```powershell
  cd C:\laragon\www\osikatu\frontend
  npm i @radix-ui/react-accordion @radix-ui/react-select @radix-ui/react-toast @radix-ui/react-switch
  ```
- 画像アップロード（MVP）は GD/Imagick が無い場合「無加工保存」になります
- EXIF は再エンコードで除去（位置情報などは保存しません）
- Next.js の cache 破損が疑われる場合:
  ```powershell
  cd C:\laragon\www\osikatu\frontend
  if (Test-Path .next) { Remove-Item .next -Recurse -Force }
  ```
- 文字コードは **UTF-8 (BOMなし)** を厳守

## AGENTS (Project rules)
````text
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
````
