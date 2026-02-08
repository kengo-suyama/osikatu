# E2E Mocking Rules (Playwright)

目的: E2E の回帰を増やさず、Windows(Laragon)でも安定して回るテストを小さく積み上げる。

## 1. Route Mocking

### LIFO (Last-In, First-Out)

`page.route()` は後に登録したものが優先される。上書き mock は「後から」登録する。

```typescript
// Base mock (共通セットアップ)
await page.route("**/api/me", (route) =>
  route.fulfill({ status: 200, body: successBody(baseMe()) }),
);

// Override (特定テストで plan=plus に上書き)
await page.route("**/api/me", (route) =>
  route.fulfill({
    status: 200,
    body: successBody({ ...baseMe(), plan: "plus", effectivePlan: "plus" }),
  }),
);
```

**実例**: `circle-hub-navigation.spec.ts` の settings テストで `myRole: "owner"` に上書き。

### Hybrid Mock (Real API + 部分 Mock)

Plus プラン限定 API（サークル作成など）はモックし、ユーザー / 推し作成は Real API を使う。

```typescript
// Real API: ユーザー作成・推し作成
await ensureOnboardingDone(request, deviceId);
await ensureOshi(request, deviceId);

// Mock: /api/circles だけ（Plus 限定で作成不可なため）
await page.route(/\/api\/circles(\?.*)?$/, (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: successBody([mockCircle()]),
  }),
);
```

**注意**: `**/api/**` のような Catch-all mock は Next.js のページ読み込みに干渉するので絶対に使わない。

## 2. Navigation / Wait

### waitUntil の使い分け

| 値 | 用途 | 注意 |
|---|---|---|
| `"domcontentloaded"` | 通常のページ遷移 | 最も安定 |
| `"commit"` | SPA 的遷移、mock 下の URL 変更確認 | 軽い |
| `"networkidle"` | ネットワーク完了が必須の時 | 不安定になりやすい |

### Data-Loaded Indicator

URL 変更だけでは弱い。クリック前にデータ読み込み完了を待つ。

```typescript
// Bad: circles データが読み込まれる前にクリック → /circles (ID なし) に遷移
await circleBtn.click();

// Good: 移動ボタン（circles 読み込み完了時のみ表示）を待つ
const goBtn = page.locator('[data-testid="quick-mode-go"]');
await expect(goBtn).toBeVisible({ timeout: 30_000 });
await goBtn.click();
```

## 3. FAB (framer-motion) の扱い

`animate={{ y: [0, -4, 0] }}` の infinite animation + ドラッグ対応がある FAB は
Playwright の通常クリックが不安定。

### 推奨パターン: dispatchEvent + evaluate fallback

```typescript
const clickFabAndWaitForDialog = async (page) => {
  const fab = page.locator('[data-testid="fab-oshi-profile"]');
  for (let attempt = 0; attempt < 3; attempt++) {
    await fab.dispatchEvent("click");
    const dialog = page.getByRole("dialog");
    const visible = await dialog.isVisible().catch(() => false);
    if (visible) return dialog;
    await page.waitForTimeout(1000);
    // Retry: evaluate-based click
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="fab-oshi-profile"]');
      (el as HTMLElement)?.click();
    });
    await page.waitForTimeout(1000);
    const visible2 = await page.getByRole("dialog").isVisible().catch(() => false);
    if (visible2) return page.getByRole("dialog");
  }
  throw new Error("FAB click did not open dialog after retries");
};
```

**理由**: `click({ force: true })` は pointer イベントを発火し、ドラッグ判定に引っかかる場合がある。
`dispatchEvent("click")` は pointer イベントを bypass する。

## 4. Sheet / Dialog 内のセレクタ

Radix Dialog (`@radix-ui/react-dialog`) ベースの Sheet は `role="dialog"` で取得。
ページ上に同名ボタン（"編集" など）がある場合、dialog 内にスコープする。

```typescript
const dialog = page.getByRole("dialog");
await expect(dialog).toBeVisible({ timeout: 10_000 });

// dialog 内の tab を取得（ページ上の "編集" ボタンと衝突しない）
const editTab = dialog.getByRole("tab", { name: "編集" });
await editTab.click();
```

## 5. Assertions

- 画面到達の確認: `data-testid` を第一優先
- 文言の揺れがある箇所: `toContainText` / 正規表現
- 非同期反映の確認: `expect().toPass({ timeout })` retry パターン

```typescript
// localStorage が非同期に更新される場合
await expect(async () => {
  const mode = await page.evaluate(() => localStorage.getItem("osikatu.quickMode"));
  expect(mode).toBe("personal");
}).toPass({ timeout: 5_000 });
```

## 6. Test IDs 命名規則

| パターン | 例 |
|---|---|
| 画面コンテナ | `circle-home`, `log-create-form` |
| 送信ボタン | `log-create-submit`, `oshi-edit-save` |
| カード / アイテム | `log-diary-card`, `log-diary-tags` |
| ナビゲーション | `circle-hub-chat`, `circle-hub-settings` |
| FAB | `fab-oshi-profile` |
| モード切替 | `quick-mode-personal`, `quick-mode-go` |

## 7. コード生成 / $\` トラップ

`String.prototype.replace()` の置換文字列で `$\`` は "match 前の文字列" に展開される。
テンプレートリテラルを含む TypeScript コードを生成する場合は必ず回避する。

```javascript
// Bad: $\` が展開されてファイル破壊
spec = spec.replace(anchor, anchor + newTestCode);

// Good: array.join + slice で挿入
const newTest = [...lines].join("\n");
const pos = spec.lastIndexOf("\n});");
spec = spec.slice(0, pos) + newTest + spec.slice(pos);
```

## 8. API Envelope

テストで API レスポンスを mock する場合の envelope:

```typescript
// 成功
const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

// エラー
const errorBody = (code: string, message: string) =>
  JSON.stringify({ error: { code, message } });
```

## 9. E2E Stress とレポート（flakyトップを可視化）

目的: `e2e:stress` を複数回回した結果から「落ちやすい spec / エラー断片」を集計して優先度付けする。

PowerShell 例:

```powershell
cd C:\laragon\www\osikatu\frontend

# 20回回す（ログを保存）
npm run e2e:stress -- 20 2>&1 | Tee-Object -FilePath logs\e2e-stress.log

# 集計レポートを生成（Markdown）
npm run e2e:stress:report -- logs\e2e-stress.log logs\e2e-stress-report.md
```

出力:
- `frontend/logs/e2e-stress.log`（生ログ）
- `frontend/logs/e2e-stress-report.md`（集計）

## Related Docs

- Windows E2E 実行手順: `docs/CODEX_LONG_TASK_WINDOWS_E2E.md`
- PR#43 安定化メモ: `docs/GITHUB_AGENTS_PR43_WINDOWS_E2E.md`
- Git Guard: `docs/dev/git-guard.md`
- Unstable Checkout: `docs/dev/unstable-checkout-playbook.md`
