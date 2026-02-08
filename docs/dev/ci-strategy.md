# CI Strategy

## Required Checks

All PRs must pass these checks before merge:

| Workflow | Job | What it checks |
|----------|-----|----------------|
| ci-frontend | frontend | Lint, tools:test, conflict markers |
| ci-backend | backend | PHPUnit tests, migrations |

## Flake Mitigation

- `retries: 1` in Playwright config for CI
- `trace: on-first-retry` for debugging
- E2E tests use `force: true` for animated elements (see Playwright + framer-motion notes)

## E2E Smoke Tests

E2E tests are not yet required in CI (run locally / nightly).
When ready, add:
- `npm run e2e:smoke` to ci-frontend
- Or a separate `ci-e2e` workflow

## Chaos Mode

Use `E2E_CHAOS=1` for extended timeouts and slowMo.
See nightly chaos workflow for automated runs.
