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

## Files on a business (2026-11-01)

- **Private Vercel Blob store.** Files are uploaded with `access: "private"` under `ws/<workspace>/contacts/<business>/<file id>-<safe name>`. The browser never gets a Blob URL. Every view and download goes through `/api/files/[id]`, which checks the signed-in member's workspace and that the business is not deleted.
- **Server upload, 4 MB max for now**, because Vercel caps a request at 4.5 MB. Server action body limit is 4.5 MB. The phone app will use direct client uploads with short-lived tokens (decision 9 above) for bigger photos.
- **Allowed types**: JPG, PNG, WebP, GIF, HEIC, PDF, TXT, CSV, Word, Excel and PowerPoint (`@grove/core` files.ts). Everything else is refused, so nothing a browser could run as a page is ever served.
- **Removing a file deletes the bytes for real** and soft deletes the row, with an activity line. It is not undoable on purpose.
- New table `contact_files` (migration 0001), applied automatically on the next Vercel deploy.

## Lite fine-tuning (2026-11-01)

- **Edit tasks**: any open task (not decide tasks) can move to a specific day (today or later) and get a note. Only reminders people set themselves can be renamed or deleted; follow-ups, check-ins and resurface tasks come from the cadence, so they are snoozed or moved, not deleted. Edits and deletes are undoable.
- **Duplicate warning on New lead**: before saving, Grove checks for the same name (lowercased, trimmed, spaces collapsed) or the same phone (last 10 digits). If found, it lists them with links and the button becomes "Add anyway". It warns, never blocks.
- **Team page** (`/team`, owners and managers): members, and the homepage waitlist signups (newest first, mailto links).
- **Password reset**: Better Auth reset flow with a one hour, single use link, signing the person out everywhere after a reset. Emails go through Resend's HTTP API when `RESEND_API_KEY` and `EMAIL_FROM` are set; until then the request quietly does nothing and the page says to ask an owner. The forgot form gives the same answer for any email so accounts cannot be probed.
- **Owner fallback**: owners can set a temporary password for a teammate on the Team page (hashed with Better Auth's own hasher, signs them out everywhere). Works without email.

## Workspaces, invites and message templates (2026-11-14)

- **Industry templates in `@grove/core`**: agency (Evergreen), small business, dealership, door to door. Big business starts from small business. A workspace copies its template's stages and cadence on creation, then owns them as data. The engine still never reads stage names.
- **Dealership stages**: New Lead, Attempting Contact, Contacted, Appointment Set, Showed, Sold (60 day check-ins), Recycle Bin (90 day resurface), Do Not Contact. Same Day 1/3/5/10/14 email, call, text cadence. This is a first draft to adjust after the pilot.
- **Open sign-up is off by default.** Setting `GROVE_OPEN_SIGNUP=true` on Vercel lets anyone create a login and then a workspace at `/start`. Until then, sign-up still needs the Evergreen team list or an invite.
- **Invites**: an owner invites a manager or salesperson by email on the Team page. When that email signs up (or is already signed in with no workspace), they join with that role. Already-existing logins cannot be invited, so nobody is moved between workspaces by accident.
- **Message templates** are per workspace (`message_templates`): channel, optional cadence day, subject (email only) and body, with merge fields `{{business}} {{contact}} {{first_name}} {{owner}} {{company}}`. Pure fill-in rules live in `@grove/core` (`messages.ts`) with tests. Missing values fall back to plain words ("there", "your business") and unknown fields are rejected on save. New workspaces get five starter templates. Owners and managers edit them at `/templates`.
- **Deferred**: AI-written messages (templates first), a "Copy message" button on tasks, role-based visibility (`canSeeAll`), billing.

## Retention and Copy message (2026-11-14)

- **Retention rule**: a business parked (Recycle Bin or Do Not Contact, found by stage group) for 28 days loses its person details: contact name, role, phone, email and social. Business name, website, stage, notes and history stay, so a Do Not Contact business is still recognised if it is added again. A "Contact details cleared" activity is written. Rules live in `@grove/core` (`retention.ts`) with tests.
- **No separate 4 week clock for socials.** They clear with the other person details, not on their own timer, so socials stay useful while a lead is active.
- **The job is off until `GROVE_RETENTION=on`.** Until then the daily cron only reports what it would clear. Turn it on after checking the Recycle Bin: Recycle Bin businesses resurface as a task after 90 days, but their phone and email are gone after 28, so a resurfaced lead needs its details found again. If that is not wanted, limit clearing to Do Not Contact stages.
- **Cron**: `apps/web/vercel.json` calls `/api/cron/retention` daily at 11:00 UTC. The route needs `CRON_SECRET` set on Vercel (Vercel sends it as a bearer token) and is otherwise 401.
- **Copy message**: follow-up tasks on Today and Tasks show a Copy message or Copy script button. The template is picked by cadence day and channel (exact day first, then any day for that channel), and filled in with the business, contact first name, the signed-in person and the workspace name. Nothing is sent by Grove.

## Phone API and QR login (2026-11-14, v2)

- **Release names**: v1 is the web app, v2 is the iPhone app, v3 is the dealership version.
- **`/api/v1`** wraps the same services as the web actions, so permissions and workspace scoping are identical. Routes: `me`, `tasks` (+ complete, snooze, decide), `businesses` (+ stage, replied, activities), `undo`, `qr/approve`. Errors come back as `{ error }` JSON with 400, 401, 403 or 404. The proxy lets `/api/v1` through because it answers 401 itself instead of redirecting to the login page.
- **Phone sign-in** uses Better Auth's bearer plugin: sign in with email and password, keep the token from the `set-auth-token` header in the phone's secure storage, send it as `Authorization: Bearer`. No cookies and no Expo auth plugin needed.
- **QR login to the web**: the login page shows a QR holding a random code (`grove://qr/<code>`) and keeps a separate poll secret in memory. The signed-in phone approves the code. The browser, holding the secret, collects a Better Auth one-time token once and exchanges it for a normal session cookie. Codes live 2 minutes, only hashes are stored, rows are single use, and the token is wiped when collected. The web browser shares the phone's session, so signing out everywhere ends both.
- **Message templates reach the phone already filled in** (tasks carry `message`), so the phone never needs the merge rules.

## iPhone app v2 (2026-11-14)

- **`apps/mobile` is Expo SDK 58 with Expo Router, outside the root npm workspaces.** React Native and Next.js need different React and tooling trees, so it installs on its own (`cd apps/mobile && npm install`). It imports only dependency-free files from `packages/core` (dates, types) and `packages/brand` through `lib/shared.ts`, with Metro watching `../../packages`.
- **Screens in v2**: login, Today, Pipeline, Businesses with search, business profile, new lead, Scan to log in. Task actions match the web (complete, tomorrow, they replied, recycle or do not contact, copy message, call and text).
- **Not in v2 yet**: push reminders, offline capture and sync, direct photo upload. Add after the first App Store build is approved.
- **Builds use EAS cloud builds** (`eas.json`), so no Mac is needed. Submission needs a paid Apple Developer account.
- **Placeholder art**: the app icon is the brand mark on teal rendered from `packages/brand`. Replace with final artwork before submission if you want something different.

## Not decided yet

- Offline sync engine for the phone (build simple "changes since" sync first, pick a library only if needed).
- Push provider details (Expo push service is the default plan).
- Dealership stage template.

## Phone polish (v2)
- Phone numbers are validated on create and update only: 7 to 15 digits, optional leading + and country code, optional extension. The CSV importer stays lenient so old sheets still import. Numbers are stored as typed; `dialable()` in core strips formatting for tel and sms links.
- Call, Text and Email on a task open the native app with the message prefilled. Nothing tracks automatically. After the app opens, returning to Grove on Today asks "Finished?" with Mark done or Not yet.
- Session refresh is silent once signed in, so the tab navigator is no longer rebuilt after an action.
- Message templates on mobile: each business profile lists templates filled in for that business, with Copy and Open in Messages or Mail. More shows a pointer. Editing stays on the web.

## Visibility (v2.1)
- Owners and managers always see every business and task. Salespeople see everything when the workspace is "team" and only their own when it is "own". Owners set this on the Team page. New dealership workspaces start as "own", everything else as "team", and existing workspaces such as Evergreen stay "team".
- Enforced in services (contacts, tasks, files, duplicate check), not in pages. A hidden business behaves as not found. A duplicate match that belongs to someone else is shown as "A teammate's business" with no link, so a rep still learns the lead is taken.
- The phone app reads `canSeeAll` from /me and hides the Whole team toggle when false.

## Pricing and billing (v2.1)
- Plans: Solo $19 flat, Team $15 per user (minimum 2), Dealership $249 per rooftop with 10 users and $12 per extra user. 14-day trial with a card, yearly costs 10 months. Placeholders, set in `packages/core/src/plans.ts`. Full detail in docs/pricing.md.
- Grove is included in Evergreen website packages by seat count (Ultra-Lite 1, Basic 1, Growth 3, Elite 5) and also sold on its own. Included workspaces use plan "included" and are never billed by Stripe.
- Stripe Checkout builds its prices inline from plans.ts, so no products or price ids exist in the dashboard. A webhook copies subscription state onto the `subscriptions` row, which is what Grove checks.
- Billing stays off until `GROVE_BILLING=on`. Migration 0006 marks every existing workspace comped, so enabling billing never locks out Evergreen.
- Seats: invites are blocked when a plan has no room (Solo, or an included package at its limit). Team and Dealership quantities sync to Stripe when people join or leave. Deleting the last member cancels the Stripe subscription.
- The iPhone app has no purchase UI, so it stays outside Apple's in-app purchase rules. A blocked workspace gets a 402 from /api/v1.
