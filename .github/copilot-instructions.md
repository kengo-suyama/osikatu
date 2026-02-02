# Osikatu – Copilot Instructions

## TL;DR
- Frontend: Next.js (port 3000) / Backend: Laravel 12 (port 8000)
- Next rewrites: `/api/*` and `/storage/*` -> `http://127.0.0.1:8000`
- API envelope is **fixed**:
  - success: `{ "success": { "data": ... } }`
  - error: `{ "error": { "code": "...", "message": "...", "details"?: ... } }`
- DTO/JSON keys are **camelCase fixed**
- operation_logs must **never store** free text / URLs / invite codes / PII
- Plan restriction is **server-side source of truth** (PlanGate + role guard)
- UTF-8 **no BOM** (PHP `declare(strict_types=1);` must be first)

---

## Repo structure
- `laravel/` : API server
- `frontend/`: Next.js app router

### Run locally
**Laravel**
```powershell
cd C:\laragon\www\osikatu\laravel
php artisan optimize:clear
php artisan serve --host=127.0.0.1 --port=8000
Non-negotiable rules (must follow)
1) API Envelope

Return only:

{ success: { data: ... } } on success

{ error: { code, message, details? } } on error

Frontend reads success.data.

2) DTO camelCase

Backend must map to camelCase (Resources/transformers).

3) No PII in operation_logs (critical)

Do NOT store:

message bodies, URLs, invite codes, user agents, IPs, locations

arbitrary strings from user inputs
Only store allowlisted keys and typed primitives.

4) Plan and role gate

Free/Premium cannot access Plus-owner features

Owner/Admin only where required (e.g., settlements)

Gate must be enforced on backend.

5) Encoding

PHP files: UTF-8 no BOM

Avoid any tool that introduces BOM.

6) Minimal diff

Prefer small changes. Do not refactor unrelated code.

Feature conventions
Events (frontend)

EVENTS.CIRCLE_CHANGE detail is object only:

{ circleId: string }

Keep backward compatibility only if already present.

PayPay button

Cannot execute payments. MVP is:

Copy amount + copy template text + open PayPay (deep link or web)

Testing expectations

Backend:

php artisan test

Ensure policy tests and feature tests pass when changed.

Frontend:

npm run lint if configured

Manual navigation checks for new pages.

When asked to implement a task

Copilot must:

Propose a plan and list touched files

Confirm API shapes (envelope/camelCase)

Implement with minimal diff

Add/Update tests where important

Provide a verification checklist + commands

---

# 4) Plan → Edit → Agent の“実行手順”（プロンプト込み）

Copilot Agent で事故らない流れを **固定手順**にします。

## 手順（固定）
### Step 0: 作業を安定させる
- `git status` が汚れてたら  
  - **(推奨)** スコープ外を stash / スコープ内を commit  
- これで「Plan/Edit/Agent切替のたびに同じ警告」も減ります

---

## Step 1: Plan（まず設計だけさせる）
Copilot Chat を **Plan** にして、このプロンプトを送る：

```text
あなたはこのリポジトリの実装者です。まず“実装はせず”に、次の要件を満たす最小差分の実装計画を作ってください。

固定仕様:
- API envelope: success.data / error.code,message,details?
- DTOはcamelCase
- operation_logsはPII/本文/URL/自由記述を保存しない（allowlist+型制限の二重防御）
- PlusのOwner/Adminのみ精算利用可（Free/Premiumは自然なロック表示）
- 端数処理: 均等割は切り上げ、端数は立替者が多めに受け取る

タスク:
1) OperationLogMetaPolicy の allowlist/型制限を強化し、テストで遮断を確認
2) サークル精算(割り勘) API/DB/operation_logs を最小MVP実装（GET一覧, POST作成, GET詳細）
3) フロント: /circles/[circleId]/settlements をMVP対応（ロック表示/コピー導線/Hub導線維持）

出力形式:
- 変更/追加するファイル一覧（パス付き）
- 追加するAPIエンドポイントとrequest/response例
- DBテーブル定義（カラム、型、FK、index）
- 認可ルール（Owner/Admin判定の具体）
- テスト方針（phpunitで何を保証するか）
- 手動確認チェックリスト（URL含む）
