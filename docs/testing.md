# Testing

- `npm test` (root): unit tests for `@grove/core` and the web services. Runs in CI.
- `npm run e2e -w @grove/web`: Playwright smoke test.

## Smoke test setup (once)

1. `npx playwright install chromium` (inside `apps/web`).
2. Use the Neon **dev** branch in `apps/web/.env.local`, never production.
3. Add a test login to the allowlist for local runs only, for example in `.env.local`: `GROVE_TEAM=e2e@evergreendigitalco.com:manager`, then create that login once at http://localhost:3000/login.
4. Run it:

```powershell
$env:E2E_EMAIL="e2e@evergreendigitalco.com"; $env:E2E_PASSWORD="<the test password>"; npm run e2e -w @grove/web
```

Without `E2E_EMAIL` and `E2E_PASSWORD` only the public checks run (homepage, signed-out redirect). The signed-in flow creates one business, completes Day 1, checks Day 3 and Undo, opens it from the command palette, moves its stage and deletes it.
