# Grove security

Last reviewed Nov 14, 2026. Re-run `npm audit --omit=dev` before every release.

## What protects customer data
- Every read and write goes through a server service scoped to the signed-in workspace. Pages and the phone API hold no database logic.
- Salespeople can be limited to their own businesses and tasks (workspace visibility setting). A hidden record behaves as not found, in lists, detail, files, reminders and the duplicate check.
- Passwords are hashed by Better Auth. Minimum 10 characters. Reset links last 1 hour and sign the person out everywhere.
- The phone keeps its session token in the iOS keychain (SecureStore). The QR login uses hashed, single-use, 2-minute codes.
- Files are private in Vercel Blob and only download through a signed-in, workspace-checked route.
- Grove never stores financing, credit, SSN or loan data.
- Retention clears parked leads' person details after 28 days when `GROVE_RETENTION=on`.
- Account deletion removes the login, and the workspace and files if the person was alone in it. It cancels any Stripe subscription first.

## Hardening done in this review
- Upgraded Next.js to 16.4.6, which fixes two critical remote code execution advisories, and upgraded zod, Vercel Blob and the test runner. The only remaining advisories are inside Vercel's own Blob helper packages and do not touch user input.
- Rate limits are now stored in the database, so they hold across Vercel's many server instances (before, each instance counted separately and the limit did almost nothing). Sign-in allows 8 tries a minute, sign-up 5, password reset 5 per 5 minutes. The QR login endpoints are limited per address.
- Database and network error text is hidden from people. They see a generic message, and the detail goes to the server log.
- Added headers that block framing, base-tag and form hijacking, on top of the existing HSTS, nosniff and referrer rules.

## Your checklist (accounts, not code)
1. Turn on two-factor sign-in for GitHub, Vercel, Neon, Stripe, Apple Developer, Expo and your Google account. A stolen login there beats every protection in the app.
2. GitHub, Settings, Branches: protect `main` so changes need a pull request and a passing CI check.
3. Neon: confirm backups and point-in-time restore are on for the production branch, and note how long history is kept on your plan.
4. Vercel environment variables: `BETTER_AUTH_SECRET` is a long random value (32+ characters) and not reused anywhere else, `CRON_SECRET` is set, and `GROVE_OPEN_SIGNUP` is only on when you want public sign-ups.
5. Vercel: turn on Deployment Protection for preview deployments so branch previews are not public.
6. Stripe: use a restricted key if you want less risk than the full secret key, and keep webhook signing enabled (already required by the code).
7. Rotate any secret that was ever pasted into a chat or screenshot.

## Known gaps
- No two-factor sign-in for Grove logins yet.
- No audit log of who viewed or changed what.
- Visibility rules are enforced in code but have no automated tests against a real database. Test with two accounts after turning "own" on: a salesperson should not see the owner's businesses in lists, search, the pipeline, or by pasting a business link.
- Sessions last Better Auth's default. Shorten them if a customer asks.
