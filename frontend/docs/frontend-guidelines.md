# Frontend Development Guidelines

---
**Applies to:** `frontend/**`
---

> **Related documentation:** See [E2E/CI Gate 運用メモ](./e2e.md) for detailed Playwright artifact specifications and logging procedures.

## Environment Configuration

### Development Ports
- **Local development:** `npm run dev` runs on port 3000 (default)
- **E2E testing:** `npm run dev -- -p 3103` runs on port 3103

### E2E Environment Variables
When running E2E tests, the following environment is configured:
```bash
NEXT_PUBLIC_DATA_SOURCE=api
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
E2E_BASE_URL=http://127.0.0.1:3103
PLAYWRIGHT_API_BASE=http://127.0.0.1:8001
```

## Testing Requirements

### Preserve Test Identifiers
- **NEVER** remove or modify `data-testid` attributes used by Playwright tests
- When adding new testable elements, use `data-testid` following the existing naming convention:
  - Format: `{component}-{element}-{identifier}`
  - Examples: `home-log-filter-全部`, `album-upload`, `billing-cancel`
- Check existing E2E tests before removing UI elements that may have test dependencies

### Playwright Best Practices
- **Avoid flaky waits:** Do NOT use arbitrary `page.waitForTimeout()`
- **Prefer proper assertions:**
  ```typescript
  // ✅ Good - explicit visibility check
  await expect(locator).toBeVisible()
  
  // ✅ Good - wait for element state
  await expect(element).toHaveText("Expected text")
  
  // ❌ Bad - arbitrary timeout
  await page.waitForTimeout(1000)
  ```
- Use appropriate timeouts in assertions when necessary:
  ```typescript
  await expect(card).toBeVisible({ timeout: 45_000 });
  ```

### React Hooks - useEffect Dependencies
- **Always** include all reactive values in `useEffect` dependency arrays
- Race condition fixes must be **explicit** and well-documented
- Example:
  ```typescript
  // ✅ Good - all dependencies included
  useEffect(() => {
    if (circleId && userId) {
      fetchData(circleId, userId);
    }
  }, [circleId, userId]); // All reactive values listed
  
  // ❌ Bad - missing dependencies
  useEffect(() => {
    fetchData(circleId, userId);
  }, []); // Missing circleId and userId
  ```

## UI Development Guidelines

### Component Design Principles
- **Keep components minimal** - avoid large refactors
- **Prefer existing patterns** - copy nearby components' style and structure
- **Maintain consistency** - follow the established design system

### UI Conventions (from AGENTS.md)
- Cards have generous spacing and clear hierarchy
- Motion duration: 0.2 - 0.35 seconds by default (not too flashy)
- Dark mode supported via `next-themes`
- Bottom navigation fixed on all pages

## Required Validation Checks

Before finalizing any frontend changes, run:

### 1. Linting
```bash
cd frontend
npm run lint
```
- Warnings are acceptable if they exist in the baseline
- New warnings/errors must be fixed

### 2. E2E Tests
For comprehensive testing:
```bash
cd frontend
npm run e2e:ci
```

For targeted testing (when changes affect specific features):
```bash
cd frontend
E2E_SPEC=tests/e2e/your-feature.spec.ts npm run e2e:ci
```

For repeating flaky tests (run 3 times):
```bash
npx playwright test tests/e2e/your-feature.spec.ts --retries=2 --workers=1
```

## Common E2E Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run e2e` | Run E2E tests locally |
| `npm run e2e:debug` | Run with headed browser, line reporter, 60s timeout |
| `npm run e2e:ui` | Open Playwright UI mode for interactive testing |
| `npm run e2e:trace` | Run with trace enabled for debugging |
| `npm run e2e:ci` | Run in CI mode (port 3103, API on 8001) |
| `npm run ci:gate` | Full gate: lint + titles:verify + e2e:ci |

## Working with Data Sources

The app supports two data source modes:
- **localStorage mode:** `NEXT_PUBLIC_DATA_SOURCE=local` (MVP)
- **API mode:** `NEXT_PUBLIC_DATA_SOURCE=api` (Laravel backend)

**Important:** Switching modes must NOT require UI code changes. Only repository layer changes are allowed.

## Summary Checklist

When touching frontend code:
- [ ] Preserve all `data-testid` attributes
- [ ] Use proper Playwright assertions (no arbitrary waits)
- [ ] Include all reactive values in `useEffect` dependencies
- [ ] Follow existing component patterns
- [ ] Run `npm run lint` (warnings OK if baseline)
- [ ] Run `npm run e2e:ci` or targeted spec repeat if relevant
- [ ] Verify changes work in both light and dark modes
- [ ] Test responsive behavior on different viewport sizes
