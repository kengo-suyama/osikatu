# 割り勘（Settlement）実装計画

> 最終更新: 2026-02-08
> 前提: [settlement-spec.md](settlement-spec.md) の強い10項目に準拠

---

## 1. DB スキーマ（MVP）

### circle_settlement_expenses

| カラム | 型 | 備考 |
|--------|-----|------|
| id | bigint PK | auto increment |
| circle_id | bigint FK → circles.id | |
| created_by | bigint FK → circle_members.id | 操作者 |
| payer_member_id | bigint FK → circle_members.id | 立替者 |
| title | varchar(255) | 支出タイトル |
| amount_yen | int unsigned | 総額（円・整数） |
| split_type | enum('equal','fixed') | 分割方式 |
| occurred_on | date | 支出発生日 |
| note | text nullable | メモ |
| status | enum('active','void') | default 'active' |
| replaced_by_expense_id | bigint nullable FK → self | void 時にリンク |
| replaces_expense_id | bigint nullable FK → self | 置換元 |
| created_at | timestamp | |
| updated_at | timestamp | |

**インデックス**: `(circle_id, status, occurred_on)`

### circle_settlement_expense_shares

| カラム | 型 | 備考 |
|--------|-----|------|
| id | bigint PK | auto increment |
| expense_id | bigint FK → expenses.id | ON DELETE CASCADE |
| member_id | bigint FK → circle_members.id | |
| member_snapshot_name | varchar(255) | 作成時点の表示名 |
| share_yen | int unsigned | この人の負担額（円） |
| created_at | timestamp | |

**制約**: shares の合計 = expense.amount_yen（アプリ層で保証）

---

## 2. API エンドポイント

すべて `/api/circles/{circleId}/settlements/` 配下。
Middleware: `auth.device` + `circle.member` + `plan.gate:plus`。

| Method | Path | 権限 | 概要 |
|--------|------|------|------|
| GET | `/expenses` | member+ | 一覧（active のみ, ?from=&to= でフィルタ） |
| POST | `/expenses` | admin+ | 新規作成（equal or fixed） |
| POST | `/expenses/{expenseId}/void` | admin+ | 取消（status→void, reason optional） |
| GET | `/balances` | member+ | メンバー別の貸借残高（再計算） |
| GET | `/suggestions` | member+ | 精算提案（貪欲法, 表示のみ） |

### POST /expenses リクエスト例

```json
{
  "title": "ランチ代",
  "amount_yen": 3000,
  "split_type": "equal",
  "payer_member_id": 5,
  "occurred_on": "2026-02-08",
  "note": "カフェABC",
  "member_ids": [5, 12, 18],
  "shares": null
}
```

fixed の場合:

```json
{
  "title": "飲み会",
  "amount_yen": 10000,
  "split_type": "fixed",
  "payer_member_id": 5,
  "occurred_on": "2026-02-08",
  "member_ids": [5, 12, 18],
  "shares": [
    { "member_id": 5, "share_yen": 4000 },
    { "member_id": 12, "share_yen": 3000 },
    { "member_id": 18, "share_yen": 3000 }
  ]
}
```

### POST /expenses/{id}/void リクエスト例

```json
{
  "reason": "金額間違い",
  "replace_with": {
    "title": "ランチ代（修正）",
    "amount_yen": 3500,
    "split_type": "equal",
    "payer_member_id": 5,
    "occurred_on": "2026-02-08",
    "member_ids": [5, 12, 18]
  }
}
```

`replace_with` が null なら純粋な取消。指定ありなら void + replace（新 expense 作成）。

### GET /balances レスポンス例

```json
{
  "success": {
    "data": [
      { "member_id": 5,  "name": "田中", "balance_yen": 2000 },
      { "member_id": 12, "name": "鈴木", "balance_yen": -1200 },
      { "member_id": 18, "name": "佐藤", "balance_yen": -800 }
    ]
  }
}
```

balance > 0 = 立て替え超過（受け取る側）、< 0 = 未払い（支払う側）。

### GET /suggestions レスポンス例

```json
{
  "success": {
    "data": [
      { "from_member_id": 12, "from_name": "鈴木", "to_member_id": 5, "to_name": "田中", "amount_yen": 1200 },
      { "from_member_id": 18, "from_name": "佐藤", "to_member_id": 5, "to_name": "田中", "amount_yen": 800 }
    ]
  }
}
```

---

## 3. 画面計画（Frontend）

### 導線

```
CircleHub (タブ or セクション)
  └─ Settlements タブ（Plus plan gate）
       ├─ 支出一覧 (expenses list)
       ├─ 残高サマリー (balances)
       ├─ 精算提案 (suggestions)
       └─ [admin] 支出追加ボタン → 作成フォーム
```

### 画面一覧

| 画面 | パス（案） | 概要 |
|------|-----------|------|
| Settlements タブ | `/circles/[id]/settlements` | 支出一覧 + 残高 + 提案をタブ or アコーディオンで表示 |
| 支出作成 | モーダル or シート | title, amount, split_type, payer, members, note |
| 支出詳細 | インライン展開 or モーダル | 各 share の内訳、void ボタン（admin） |

### Plan Gate / RBAC 統合

| チェック | 実装箇所 | 挙動 |
|----------|---------|------|
| Plus plan | API middleware + UI ルート | Free circle → 403 / UI で「Plusプランで利用可能」表示 |
| admin+ (書き込み) | API policy + UI ボタン非表示 | member → 403 / 作成・取消ボタンを非表示 |
| circle member | API middleware | 非メンバー → 403 |

---

## 4. 端数処理アルゴリズム（equal split）

```
function equalSplit(amountYen: number, memberCount: number, payerIndex: number): number[] {
  const base = Math.floor(amountYen / memberCount);
  const remainder = amountYen - base * memberCount;
  const shares = Array(memberCount).fill(base);
  shares[payerIndex] += remainder;
  return shares;
}
```

検証: `shares.reduce((a, b) => a + b, 0) === amountYen` が常に成立。

---

## 5. 精算提案アルゴリズム（greedy）

```
function suggest(balances: { memberId: number; amount: number }[]): Suggestion[] {
  const debtors = balances.filter(b => b.amount < 0).map(b => ({ ...b, amount: -b.amount }));
  const creditors = balances.filter(b => b.amount > 0).map(b => ({ ...b }));
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const suggestions: Suggestion[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    suggestions.push({ from: debtors[i].memberId, to: creditors[j].memberId, amount: transfer });
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return suggestions;
}
```

---

## 6. PR ロードマップ

| PR | ブランチ名（案） | スコープ | Done 条件 |
|----|-----------------|---------|----------|
| **PR-A** | `docs/settlement-strong10-v1` | 本ドキュメント + spec | CI green |
| **PR-B** | `feat/settlement-schema-readonly` | migration, model, repository, controller (read-only API) | `php artisan test` 追加分 pass |
| **PR-C** | `feat/settlement-ui-readonly` | Next.js 画面（閲覧のみ）+ Plan gate | `npm run lint` clean |
| **PR-D** | `feat/settlement-create-void` | POST expenses, POST void/replace | unit test + integration test |
| **PR-E** | `test/settlement-e2e-smoke` | E2E: 一覧表示 + 権限ガード | `e2e:smoke` に追加、~2分以内 |

---

## 7. MVP Done 条件

- [ ] Plus circle の admin が expense を作成できる
- [ ] equal / fixed 分割で shares が正しく生成される
- [ ] void / replace で履歴が保持される
- [ ] member は閲覧のみ（作成・取消不可、403）
- [ ] balances が active expense から正しく再計算される
- [ ] suggestions が貪欲法で最小送金回数を提案する
- [ ] Free circle / 非メンバーは 403
- [ ] 退会メンバーの過去データが表示名付きで残る
