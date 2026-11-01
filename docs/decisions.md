# Grove: Decisions

Every architecture decision, with the reason. Claude Code reads this before changing structure. Newest at the bottom of each section.

## Stack (2026-10-06)

- **Next.js 16 + TypeScript + Tailwind v4, Neon Postgres + Drizzle, Better Auth, Vercel Blob, Vercel hosting.** Replaces Supabase. Free tiers cover building and the Evergreen trial; Better Auth runs inside our app so logins are not tied to a database vendor.
- **Start from the Evergreen Digital Website Template.** Reuses the SEO setup (site-config, metadata, JSON-LD, robots, sitemap), security headers, 404, legal pages and CI. Grove is a product, not a client site, so the template's "no database by default" rule does not apply here.

## Built for the iPhone app from day one (2026-10-06)

The iPhone app comes after the web app. These choices cost little now and a lot to retrofit.

1. **Monorepo with npm workspaces.**
   - `apps/web`: the Next.js app (marketing site at `/` plus the signed-in app). The template's `website/` folder moves here.
   - `apps/mobile`: the iPhone app, added later. Empty placeholder for now.
   - `packages/core`: cadence engine, domain types, zod input schemas, date helpers. Plain TypeScript, no Next.js or React imports, so the iPhone app can use the exact same rules.
   - `packages/db`: Drizzle schema, migrations and client.
   - `packages/brand`: color, radius and font tokens as a TypeScript object. Web CSS and the iPhone app both read from it, so the brand stays identical.
   Why: sharing code between web and phone needs separate packages. Moving files into this shape later means touching every import.

2. **iPhone app will be Expo (React Native), not a web wrapper.** Supersedes the earlier Capacitor idea. Reasons: QR scan-to-login needs the camera, follow-ups need push notifications, field sales needs it to work on bad signal, it should feel native, and Apple can reject apps that are only a website in a shell. Better Auth supports Expo, and Expo can use `packages/core` and `packages/brand` directly.

3. **Business logic lives in services, not in server actions.** Every read and write is a plain function in `apps/web/lib/services` that takes `(ctx, input)`, where ctx is the signed-in user, workspace and role, and input is checked with a zod schema from `packages/core`. Server actions are thin wrappers around these. Later, `/api/v1` route handlers wrap the same functions for the iPhone app. Why: server actions only work from the web app. With this split, adding the phone API is wiring, not a rewrite.

4. **IDs are UUIDv7, generated in our code.** Lets the phone create a lead offline and sync it later without ID clashes, and keeps records sortable by creation time.

5. **Every synced table has `updated_at` and `deleted_at`.** Deletes are soft (set `deleted_at`). The phone app syncs "everything changed since my last sync" and needs to learn about deletes too. Data-retention clearing still wipes the personal fields for real; soft delete is for records, not for privacy.

6. **Time zones are stored, not assumed.** Workspaces have a `timezone` (default `America/Los_Angeles`), users can override it. Due dates stay day-level (`YYYY-MM-DD`, no times). "Today" is always worked out in the workspace or user time zone and passed into the cadence engine, never read from the server clock inside it. Why: a laptop, a phone and a Vercel server in another region must agree on what "due today" means.

7. **URLs are stable and shareable** (`/businesses/[id]`, `/today`, `/pipeline`, `/tasks`). The iPhone app will open these same links (universal links on thegrovecms.com), so do not rename routes casually.

8. **Reserved identifiers.** Bundle ID `com.thegrovecms.app`, URL scheme `grove`, app name "Grove". Better Auth `trustedOrigins` will include `grove://` when the app is added.

9. **Files from the phone** will upload straight to Vercel Blob with short-lived upload tokens issued by a guarded route, so large photos never pass through our server.

## Data rules

- Grove never stores financing, credit, SSN or loan data.
- Pipeline stages and cadences are data per workspace, never hardcoded.
- The database table is `contacts`; the UI calls them "Businesses".
- Day-level dates only. No em dashes in UI copy or docs.

## Grove Lite (2026-10-30)

- **One workspace for now (Evergreen Digital).** Our own `workspaces` and `memberships` tables instead of Better Auth's organization plugin, simpler and enough for Lite. Multi-workspace sign-up comes with the dealership pilot.
- **Sign-up is limited to an allowlist** (`GROVE_TEAM` env var, `email:role` pairs) checked on the server in a Better Auth hook, instead of fully disabled sign-up plus a create-user script. Teammates create their own password and land in the workspace with the right role. Adding someone is one env var edit.
- **Migrations run on every Vercel deploy** (`vercel-build` script). No one has to run them by hand against production.
- **Writes use Neon batches** (one transaction per batch over HTTP) so a stage change and its task changes land together.
- **Cadence day numbers**: Day 1 is the day the lead was added, so Day N is due on created date plus N minus 1. A late completion schedules the next step no earlier than today.
- **Leaving New Lead**: completing the Day 1 follow-up moves a lead to the next active stage (Reached Out).
- **Proposal Sent stops the cadence** like Contacted does, since they have clearly talked to us.
- **Decide task targets** are found by behavior: Recycle is the parked stage with resurface days, Do Not Contact is the parked stage that clears tasks.
- Deferred from Lite: undo toasts, command palette, CSV import from Sheets, file uploads (Vercel Blob), dnd-kit (native drag plus a stage menu for now), Playwright suite, auto-sent emails and texts.

## CSV import (2026-11-01)

- **Owners and managers only**, at `/import`. The role check lives in the import service; the nav link is hidden for salespeople.
- **The file is never stored.** It is parsed in memory on the server with papaparse for each step (analyze, dry run, import). Max 2 MB and 5000 rows. Server action body limit raised to 3 MB for this.
- **Pure rules live in `packages/core/src/importer.ts`** (header guesses, value parsing, dedupe, starting tasks) with tests. The service loads data, calls core and writes.
- **Sensitive columns are never read.** Headers that look like financing, credit, SSN, loan, bank or income data default to Skip, cannot be remapped in the UI, and core ignores them even if mapped.
- **Duplicates**: same digits-only phone (7+ digits, US country code dropped) or same lowercased, trimmed business name, checked against existing contacts and earlier rows in the same file. Duplicates are skipped, never merged.
- **Created date**: the mapped column if it parses as a day (ISO, M/D/YY(YY), or month names), otherwise today. Future dates clamp to today. Stored as `created_at` at noon UTC so it stays on the same day in US time zones, and as `cadence_started_on`.
- **Starting tasks reuse the engine.** `onCreate` takes an optional `startedOn` (Day 1). For any stage with cadence behavior `start` (not only the default-new stage, so an old "Reached Out" row is treated the same): if the lead is 14 or more days old it gets one decide task due today with the cadence off; otherwise the cadence starts from the created date with the next step no earlier than today. Every other stage gets the engine's normal entry behavior from today (client check-ins, recycle resurface, DNC clears).
- **Stage values** in the CSV auto-match a workspace stage by label or key; anything unmatched uses the chosen default stage unless mapped by hand.
- **Unknown tier values** are kept as a line in notes instead of failing the row. Bad emails, bad launch dates and missing names are row errors.
- **Writes go in Neon batches of 100** (one transaction each). If a later batch fails, earlier batches stay; running the import again skips them as duplicates.
- **One "Imported from CSV" system activity** per business.

## Undo on toasts (2026-11-01)

- **Covered actions**: complete a task, snooze, move stage (board and profile), They replied, Recycle or Do not contact, change owner, delete a business. Creating, editing and logging are not undoable (just edit or delete).
- **How it works**: the service records exactly what it changed (contact fields before, tasks it created, tasks it cancelled, the task it completed or snoozed, task owners, activities it wrote) and returns it as a token signed with HMAC using `BETTER_AUTH_SECRET`. The browser only holds the token. `applyUndo` checks the signature, that it is the same person and workspace, and a 2 minute window, then reverses those exact rows in one Neon batch. Activities and created tasks are soft deleted.
- **Safety check**: engine writes now set the contact's `updated_at` explicitly. Undo refuses ("This business changed since") if the contact was changed again after the action, so an undo never stomps on newer work.
- **Created task and activity IDs** are generated in `applyEffects` (UUIDv7) so the undo knows them without a read back.
- The toast shows Undo for 6 seconds; the token itself is valid for 2 minutes.

## Command palette (2026-11-01)

- **Opens with Ctrl or Cmd K anywhere, or "/" when not typing.** Also a "Search or jump" button in the top bar so it works on touch screens.
- **Actions**: Add a lead, Set a reminder, Go to Today, Pipeline, Businesses, Tasks, Switch theme, and Import from CSV for owners and managers.
- **Businesses** search by name, niche and contact using a small fuzzy matcher in `@grove/core` (`search.ts`, tested): prefix, then word start, then initials ("mca" for Mill Creek Auto), then substring, then letters in order. No library. It searches the list the app layout already loads (up to 500), so no extra request per keystroke.
- **Accessible as an ARIA combobox**: focus stays in the input, results are a listbox announced with `aria-activedescendant`, arrows, Home, End, Enter and Esc all work.

## Not decided yet

- Offline sync engine for the phone (build simple "changes since" sync first, pick a library only if needed).
- Push provider details (Expo push service is the default plan).
- Dealership stage template.
