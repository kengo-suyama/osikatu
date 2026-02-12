# CI Required Checks

## Merge Requirements

Both of these GitHub Actions jobs MUST pass before a PR can be merged:

| Job | Workflow | What it checks |
|-----|----------|---------------|
| `frontend` | ci-frontend | Lint, tools tests, conflict markers |
| `e2e-billing` | ci-frontend | E2E billing gates (Playwright) |
| `backend` | ci-backend | PHP unit tests |
| `ci-gate` | ci-frontend | Summary gate (fails if any job failed) |

## GitHub Branch Protection

To enforce these as required checks, configure in GitHub Settings:

1. Settings > Branches > Branch protection rules > Edit (main)
2. Enable "Require status checks to pass before merging"
3. Add required checks: `ci-gate`, `backend`

## What E2E Billing Smoke Tests

- Free user sees 402 paywall on settlement
- Free user is redirected to /pricing
- Plus user can access settlement features
- Checkout flow redirects to Stripe URL

See `frontend/tests/e2e/billing-gates.spec.ts` for details.
