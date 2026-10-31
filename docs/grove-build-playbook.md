# Grove: Build Playbook (Windows, fresh start)

A step-by-step path from "prototype and brand guide" to "live product on thegrovecms.com". You are starting from an empty GitHub repo, so nothing here depends on old code. Work top to bottom. Every Claude Design and Claude Code prompt is ready to paste.

Updated 2026-10-06: Supabase replaced with Neon + Better Auth + Vercel Blob. Starts from the Evergreen template as a monorepo ready for the iPhone app.

**Your setup**
- Repo: `github.com/JustTegan7/grove-crm` (private)
- Code folder: `C:\dev\grove` (not OneDrive, see Step 1)
- Starting point: the Evergreen Digital Website Template
- Domain: `thegrovecms.com` (purchased, settled)
- Machine: Windows with PowerShell
- Tagline: "A CRM with nothing in the way."

**Locked stack**
Next.js 16 (App Router) + TypeScript + Tailwind v4, Neon Postgres via Drizzle ORM, Better Auth (runs in the app, tables live in Neon), Vercel Blob for files, hosted on Vercel. Monorepo with npm workspaces so the future iPhone app (Expo) shares the same rules, types and brand.

**Read `docs/decisions.md` first.** It lists every architecture decision and why, including the nine choices made now so the iPhone app is a clean add later:

```
apps/web         Next.js: marketing site + signed-in app (from the template's website/)
apps/mobile      Expo iPhone app (later, placeholder for now)
packages/core    cadence engine, types, zod schemas, date helpers (no Next.js or React)
packages/db      Drizzle schema, migrations, client
packages/brand   colors, radii, fonts as TypeScript tokens
```

**Built in from day one (from the spec)**
Workspaces with account types, roles (Owner, Manager, Salesperson), stages and cadences stored as data per workspace, and a no-financing-data rule. Cheaper to build in now than to retrofit before the dealership pilot.

**Not in this pass (later phases)**
Auto-sent emails, AI-personalized messages, text review queue, QR scan-to-login, Drivonic integration, data-retention auto-clear job.

**Process note:** the spec (Phase 2) still had open questions before Gate 2. Answer those before running Step 6, since the schema is where a wrong assumption costs the most.

**What you download from the chat**
- `grove-design-pack.zip`: contains `CLAUDE.md` (project rules Claude Code reads automatically), and a `design/` folder with the prototype, brand guide, this playbook, and empty `brand/` and `screens/` folders.
- The same files are also attached separately if you want them individually.

---

## Part 1: What I still need from you

Nothing blocks you from starting. Answer these in the chat when you reach them.

| # | Need | When |
|---|---|---|
| 1 | **Logo pick** from Claude Design (Step 2). Tell me which option and I will adjust the site and prototype. | Step 2 |
| 2 | **Tagline pick:** "A CRM with nothing in the way.", "Your pipeline, grown simply.", or "A customer management system with nothing in the way." | Step 7 |
| 3 | **Neon database and Blob store** connected to the Vercel project (see Phone setup below). | Before Step 4 |
| 4 | **Answers to the open spec questions** (Phase 2, Gate 2). | Before Step 6 |
| 5 | **Emails for Tegan, Canyon and Karl** to create logins, plus Canyon's and Karl's role (manager or salesperson). | Step 12 |
| 6 | **A CSV export of your Google Sheets tracker** for the one-time import. | Step 11 |
| 7 | **Apple Developer setup started** (see "iPhone prep" below). Slow paperwork, so start it early. | Anytime |

**Safety rules, always**
- The repo stays **private**. Grove is a product you plan to sell.
- Never paste database URLs, `BETTER_AUTH_SECRET` or `BLOB_READ_WRITE_TOKEN` into any chat or commit them. They live in `.env.local`, which is git-ignored, and in Vercel's environment variables.
- Grove never stores financing, credit, SSN or loan data.
- Commit after every step so you can roll back.

---

## Part 2: Step by step

### Step 0. Quick tools check (2 minutes)

In PowerShell:

```powershell
git --version
node --version
```

You want Git and Node 20 or newer. If Node is missing, install the LTS version:

```powershell
winget install OpenJS.NodeJS.LTS
```

Close and reopen PowerShell afterwards.

### Step 1. Get one clean copy of the code at C:\dev\grove

Right now Grove lives at `OneDrive\Desktop\Evergreen Digital\Dev\Grove`: a copy of the Evergreen Digital Website Template (`website/`, `docs/`, CI), not yet a git repo. That is the right starting point. The location is the problem: OneDrive syncs every file, including `node_modules`, `.next` and `.git` (tens of thousands of files), which causes slow builds, locked files and git corruption. Code lives at `C:\dev\grove`. Your OneDrive folder keeps docs and exports only.

1. Check GitHub first. Open `github.com/JustTegan7/grove-crm`.
   - **If it already has the website code** (the version Vercel deploys), clone it and use that, since it is the live one:

```powershell
cd C:\
mkdir dev
cd C:\dev
git clone https://github.com/JustTegan7/grove-crm.git grove
cd grove
```

   Then copy `docs\decisions.md` and `docs\grove-build-playbook.md` from the OneDrive Grove folder into `C:\dev\grove\docs\`.

   - **If the repo is empty**, move the OneDrive copy over, minus the heavy folders:

```powershell
cd C:\
mkdir dev
robocopy "$HOME\OneDrive\Desktop\Evergreen Digital\Dev\Grove" C:\dev\grove /E /XD node_modules .next "Claude outputs"
cd C:\dev\grove
del package-lock.json
git init
git branch -M main
git remote add origin https://github.com/JustTegan7/grove-crm.git
```

   (`Claude outputs` holds the Tata's demo, which belongs to Evergreen, not Grove. The root `package-lock.json` is an empty leftover.)

2. Add the design references if you have them (`design\grove-prototype.html`, `design\grove-brand-and-ux-guide.md`, `design\brand\`, `design\screens\`). Open the prototype by double-clicking it. That is the reference for everything you build.

3. First commit:

```powershell
git add -A
git commit -m "Start Grove from the Evergreen Digital Website Template"
git push -u origin main
```

If Git asks you to sign in, use the browser prompt. Once the push works, delete `node_modules` and `.next` from the OneDrive copy (or the whole OneDrive Grove folder) so OneDrive stops syncing them.

### Step 2. Claude Design round 1: the logo

Open Claude Design and paste **Prompt A**. It gives you three options. Pick your favorite, export an SVG and a 1024px PNG, and save them in `C:\dev\grove\design\brand\`.

**Prompt A: refine the chosen mark**

```
Design a logo for "grove", a simple customer management system for small sales teams. Mark: three overlapping circles rising from small at lower left to large at upper right, like tree canopies seen from above and a growing pipeline. Sit them on a rounded-square tile in deep teal-green #0F3D3A. Circle colors #4FB39C, #7FC28A and #B8E066, each separated from the next by a thin gap in the tile color. Pair with a lowercase wordmark "grove" in Bricolage Grotesque ExtraBold with tight letter spacing. Give me 3 variations: (1) icon plus wordmark side by side, (2) icon only as an app icon at 1024px, (3) wordmark only. Show each on light sage #EEF2EC and on dark #0B1A18. Friendly, modern, calm. No gradients, no drop shadows, no leaf clip-art.
```

**Prompt B: three different concepts (use if A does not click)**

```
Create 3 distinct logo concepts for "grove", a friendly no-clutter customer management system. Concept 1: a lowercase g whose bowl is a single leaf. Concept 2: three round-topped trees of different heights standing on one ground line. Concept 3: a 3x3 grid of dots where one dot is larger and lime green. Palette: deep teal-green #0F3D3A, sprout lime #B8E066, white. Flat vector, geometric, works at 16px favicon size and on a 1024px app icon. Lowercase wordmark in a heavy rounded grotesque. Show each concept on light and dark backgrounds.
```

Once the logo is locked, run these two later (any time before launch):

**Prompt C: full brand kit and banners**

```
Using this logo, build a brand kit for grove: full logo lockup, icon-only, wordmark-only, one-color versions in white and in #0F3D3A, a favicon at 32px, a 1024px iOS app icon, and banners for LinkedIn (1584x396), X (1500x500), YouTube (2560x1440) and Instagram highlight covers. Headline on banners: "A CRM with nothing in the way." Background sage #EEF2EC or deep canopy #0F3D3A, with soft overlapping circles as the decorative motif. Include the small line "A product from Evergreen Digital Co." on the LinkedIn banner only.
```

**Prompt D: Grove next to Evergreen**

```
Place the grove logo next to the Evergreen Digital Co. logo (forest green, serif wordmark) and show how they look as a pair on a business card, a website footer and a slide title page. The two should feel like siblings: same natural theme and rounded softness, but grove is bolder, sans-serif and lime-accented. Suggest spacing and sizing rules for when both appear together.
```

Save the exports:

```powershell
git add -A
git commit -m "Add logo exports"
git push
```

### Step 3. Claude Design round 2: product screens and marketing page

Paste **Prompt E**, pick your favorite of the three options, and export it into `design\screens\`.

**Prompt E: product UI screens**

```
Design the main screens of grove, a customer management system for small sales teams. Style: calm, spacious, sage background #EEF2EC, white cards, deep teal-green #0F3D3A buttons, lime #B8E066 highlights, Bricolage Grotesque headings and Figtree body. Sidebar has only four items: Today, Pipeline, Businesses, Tasks. Screens: (1) Today list grouped Overdue and Due today, with a small pipeline summary on the right, (2) kanban Pipeline with five stages and a collapsed Parked area, (3) business profile drawer sliding in from the right with contact info, a follow-up plan showing Day 1, 3, 5, 10, 14 and tabs for Notes, Site and plan, Files. Show 3 options and a mobile version of Today with a bottom tab bar and a center add button.
```

**Prompt F: marketing page**

```
Design the marketing homepage for grove, a CRM with nothing in the way (the domain is thegrovecms.com and the product is a customer management system). Hero headline: "A CRM with nothing in the way." with the word "nothing" highlighted by a lime swash (text must stay readable on both light and dark backgrounds; on dark, use a translucent lime behind light text). Right side: a small interactive-looking "Today" card with three tasks. Sections in order: Why grove (a comparison of a typical CRM sidebar with 26 items versus grove's 4), a tour with four tabs (Follow-ups, Pipeline, Profiles, On your phone), How it works in three steps, an origin story block "Built by people who chase leads every day", FAQ, and a waitlist signup. Palette: sage #EEF2EC, white, deep teal-green #0F3D3A, lime #B8E066. Fonts: Bricolage Grotesque headings, Figtree body. Show 3 hero options and the mobile layout.
```

```powershell
git add -A
git commit -m "Add screen exports"
git push
```

### iPhone prep (paperwork, start anytime)

The app is built later, but Apple's side takes time, so start now:
1. Get a free **D-U-N-S number** for Evergreen Digital Co. (Apple checks it to publish under the business name instead of your personal name). It can take a couple of weeks.
2. Once you have it, enroll in the **Apple Developer Program as an organization** (annual fee). This needs Evergreen to be a registered legal entity.
3. In App Store Connect, create the app record to reserve the name "Grove" (or the closest available) with bundle ID `com.thegrovecms.app`.

Check Apple's current enrollment page for exact requirements and price when you do this.

### Vercel setup (5 minutes, do anytime before Step 4)

1. Vercel, open grove-crm, **Storage** tab, **Create Database**, choose **Neon**, connect it to the project. Vercel adds the database variables for you.
2. Same Storage tab, **Create**, choose **Blob**, connect it to the project. Adds `BLOB_READ_WRITE_TOKEN`.
3. Domain: Settings, Domains, add `thegrovecms.com` and `www.thegrovecms.com`, then copy the shown records into Northwest DNS. Transfer the domain to Vercel later (new domains are usually locked for 60 days).

### Computer setup (once, before Step 4)

```powershell
npm i -g vercel
cd C:\dev\grove
vercel link
mkdir apps\web -Force
vercel env pull apps\web\.env.local
```

This pulls the Neon and Blob variables into `apps\web\.env.local` (where Next.js reads them) without you copying any keys. Later pulls use the same command from `C:\dev\grove`. `.env.local` must stay git-ignored. Never paste these values into a chat.

Generate the auth secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

In Vercel, Settings, Environment Variables, add `BETTER_AUTH_SECRET` (that value) and `BETTER_AUTH_URL` set to `https://thegrovecms.com`. Then run `vercel env pull apps\web\.env.local` again, and set `BETTER_AUTH_URL=http://localhost:3000` in your local copy only.

When you push Step 4: in Vercel, Settings, Build and Deployment, set **Root Directory** to `apps/web` (it was `website` if the template was already deploying). Otherwise the next deploy fails.

Recommended: in the Neon console, create a branch named `dev` and use its connection string as `DATABASE_URL` in `.env.local`, so local testing never touches real data.

### Step 4. Claude Code: turn the template into the Grove monorepo

Open PowerShell in `C:\dev\grove`, run `code .` to open VS Code, and start Claude Code in that folder (run `claude` in the terminal). Use **plan mode** (press Shift+Tab until it says plan mode) and read the plan before approving.

```
Read docs/decisions.md, website/AGENTS.md, README.md, docs/BUILD-NOTES.md and design/grove-prototype.html (if present). This repo is a copy of the Evergreen Digital Website Template. We are turning it into Grove, a CRM product, laid out as the monorepo described in docs/decisions.md. Check the Next.js docs in node_modules/next/dist/docs/ and current Better Auth, Drizzle and Neon docs rather than relying on memory.

1. Restructure with npm workspaces (root package.json with "workspaces": ["apps/*", "packages/*"]):
   - Move website/ to apps/web with git mv so history is kept. Keep the template's SEO setup (lib/site-config.ts, lib/seo.ts, lib/structured-data.ts, robots, sitemap, security headers, 404, privacy and terms) and fill site-config with Grove's details (name Grove, url https://thegrovecms.com, tagline "A CRM with nothing in the way.", from Evergreen Digital Co.). Remove the template's placeholder marketing copy and unused demo SVGs in public/.
   - Create packages/core, packages/db and packages/brand as TypeScript packages (@grove/core, @grove/db, @grove/brand) that apps/web imports. packages/core must not import next, react or anything browser or server specific. Add a lint rule or test that enforces this.
   - apps/mobile: only a README saying the Expo iPhone app goes here later, with the reserved bundle ID and URL scheme from docs/decisions.md.
   - Update .github/workflows/ci.yml to install from the root and run lint, typecheck, test and build for all workspaces. Add a root .gitignore covering node_modules, .next, .env*, .vercel and "Claude outputs".
2. Write a root CLAUDE.md (and keep apps/web/AGENTS.md, updated for Grove rather than client sites) with these rules:
   - Stack: Next.js 16 App Router, TypeScript, Tailwind v4, Neon Postgres with Drizzle ORM and drizzle-kit migrations, Better Auth (email and password, sign-up disabled, tables in Neon via the Drizzle adapter), Vercel Blob for files, deployed on Vercel with Root Directory apps/web.
   - Follow docs/decisions.md. Read it before changing structure, and add to it whenever a decision is made.
   - All data access happens on the server. The browser never talks to the database. Every read and write is a service function in apps/web/lib/services taking (ctx, input), with input validated by a zod schema from @grove/core, and every query scoped to ctx's workspace with role checks in that same layer. Server actions are thin wrappers that build ctx and call a service. No business logic in components or server actions.
   - Domain rules (cadence, stage behavior, date math) live in @grove/core as pure functions. "Today" is passed in, computed in the workspace or user time zone, never read from the server clock inside core.
   - IDs are UUIDv7. Synced tables carry updated_at and deleted_at (soft delete).
   - Grove never stores financing, credit, SSN or loan data. Do not add fields for it.
   - Pipeline stages and cadences are data per workspace, never hardcoded in UI or logic.
   - Day-level dates only. No em dashes in any UI copy or docs.
3. Auth: install better-auth, drizzle-orm, drizzle-kit, @neondatabase/serverless, @vercel/blob, zod and a UUIDv7 helper in the right workspaces. Set up Better Auth with the Drizzle adapter (auth tables defined in packages/db), the Next.js route handler, and a session check in apps/web/proxy.ts that gates every route except an exact-match public list: "/", "/login", "/privacy", "/terms" plus robots and sitemap (NOT startsWith). Disable public sign-up. Configure it so adding the Expo client later is only a plugin and a trustedOrigins entry, and note where in a code comment.
4. Add `npm run create-user` (email, password, display name). Because public sign-up is disabled, use the supported server-side way to create users (for example the admin plugin) instead of the sign-up endpoint.
5. A /login page and a signed-in placeholder at /today.
6. Add vitest (all workspaces), @playwright/test, @dnd-kit/core and @dnd-kit/sortable.
7. apps/web/.env.local.example listing DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL and BLOB_READ_WRITE_TOKEN. packages/db's drizzle config reads apps/web/.env.local.
8. Update README.md (setup: npm install at the root, vercel link, vercel env pull apps\web\.env.local, running dev), write docs/architecture.md (the monorepo map and the service layer) and docs/roadmap.md, and replace docs/BUILD-NOTES.md with a short note that Grove started from the template. Add to docs/decisions.md anything you decided.
Do not build features. From the root, npm run build, npm run lint, npm run typecheck and npm test must pass. Commit "Grove monorepo from Evergreen template, Neon, Better Auth, auth gate".
```

Check: run `npm run dev` from `C:\dev\grove`, open http://localhost:3000, and confirm the page loads and that visiting `/today` while signed out sends you to `/login`. Then set Vercel's Root Directory to `apps/web` and push:

```powershell
git push
```

### Step 5. Claude Code: brand tokens and UI kit

Start a fresh Claude Code session.

```
We are building the grove brand into the app. Read CLAUDE.md, design/grove-brand-and-ux-guide.md, and the :root, dark-theme and component CSS in design/grove-prototype.html. Do this:
1. Define the brand tokens once in packages/brand as a typed TypeScript object (light and dark): the exact colors, radii, shadows and font names from the prototype's :root block. The future iPhone app reads this same object. Then put them in Tailwind v4 using @theme in apps/web's global CSS, generated from packages/brand by a small script (npm run tokens) or checked against it by a test, so the two can never drift. Replace the template's placeholder tokens. Support three states like the prototype: system preference, and explicit light or dark via a data-theme attribute on <html>. Include the --mark token so the hero highlight on the word "nothing" stays readable in dark mode.
2. Load Bricolage Grotesque (display) and Figtree (body) with next/font. No layout shift.
3. Put the logo SVG source in packages/brand (so the app icon and splash can use it later) and add it as a React component in apps/web (icon, wordmark, and combined). Use the SVG in design/brand/ if present, otherwise recreate the three-circle mark from the prototype's logoMark().
4. Build shared components in components/ui: Button (primary, ghost, soft, danger; sm and lg), DuePill (overdue = clay, today = sun, otherwise neutral), Avatar, StagePill, Drawer, Modal, Toast (with an Undo action), and a segmented control.
5. Add a dev-only /kit page that shows every component in light and dark, so I can compare with the prototype.
Do not touch data or product routes yet. Run npm run build and npm run lint, then commit as "Brand tokens and UI kit".
```

Check: open `/kit` beside the prototype. Colors, fonts and pills should match.

### Step 6. Claude Code: the database

Answer the open spec questions first. Then start a fresh session in **plan mode** and read the plan carefully, this is the foundation.

```
Design the full Grove schema in Drizzle in packages/db with drizzle-kit migrations. Read CLAUDE.md, docs/decisions.md and the seed(), moveBiz() and completeTask() functions in design/grove-prototype.html first. Keep the table named contacts but call it "Businesses" in the UI, and record that in docs/decisions.md.

Workspaces and roles:
- Use Better Auth's organization plugin as the workspace layer if it supports what we need; check current docs. Each workspace has an account_type: door_to_door, small_business, big_business or dealership (store it on the organization or in a workspace_settings table, whichever the docs support cleanly).
- Roles inside a workspace: owner, manager, salesperson (custom roles via Better Auth access control). Owners and managers see everything in the workspace. Salespeople see everything for now, but put the check in one place so we can restrict it later.
- profiles data (display_name, initial, color) lives on the user or a profiles table linked to it.

Configurable pipeline:
- pipeline_stages: id, workspace_id, key, label, position, color, group (active, won, parked), cadence_behavior (start, stop, none), checkin_days (nullable int), resurface_days (nullable int), clears_tasks (bool), is_default_new (bool).
- cadence_templates: id, workspace_id, name, is_default. cadence_steps: id, template_id, day_offset, channel (email, call, text), position.
- After the last cadence step, a decide task (recycle or do not contact) is created. It never resolves on its own.
- Industry templates as seed data in code (packages/core/templates). Template "agency": stages New Lead, Reached Out, Contacted, Proposal Sent, Client (checkin 30 days), Recycle Bin (resurface 90 days, parked), Do Not Contact (clears tasks, parked). Cadence: Day 1 email, Day 3 call, Day 5 text, Day 10 email, Day 14 call. Write a function that copies a template into a new workspace. Leave a placeholder for a "dealership" template.

Every table: UUIDv7 id generated in code, created_at, updated_at (kept current on every write) and deleted_at for soft delete, except Better Auth's own tables. Workspaces also get timezone (default America/Los_Angeles); users get an optional timezone override.

Records (all with workspace_id, all foreign keys indexed):
- contacts: id, workspace_id, name (required), niche, stage_id, owner_id, contact_name, contact_role, phone, email, website, social, source, notes, tier (nullable: Ultra-Lite, Basic, Growth, Elite), site_url, launch_date (date), checkin_frequency, cadence_template_id, cadence_active (bool), cadence_done (int[]), last_activity_at, created_at, stage_changed_at, created_by.
- tasks: id, workspace_id, contact_id (cascade), kind (followup, decide, manual, client, resurface), channel (nullable email, call, text), title, note, due_date (date only), done_at, cadence_step_id, owner_id, created_by, created_at.
- activities: id, workspace_id, contact_id (cascade), type (call, text, email, note, reply, stage, system), body, actor_id, created_at.
- contact_files: id, workspace_id, contact_id, blob_pathname, name, size, created_by, created_at. Files go to Vercel Blob; downloads go through a server route that checks the workspace before serving.
- waitlist_signups: id, email (unique, lowercased), created_at. Not workspace-scoped.

Indexes: tasks(workspace_id, due_date) where done_at is null, tasks(contact_id), contacts(workspace_id, stage_id), contacts(owner_id), activities(contact_id, created_at desc).

Indexes also cover (workspace_id, updated_at) on contacts, tasks and activities, so the iPhone app can later sync "what changed since". Default every query to deleted_at is null.

Also: the service layer in apps/web/lib/services with a getCtx() / requireMember(role?) helper that every query goes through, and zod input schemas in packages/core, a seed script that creates the Evergreen Digital workspace from the agency template and adds me as owner, and docs/database.md explaining how to run migrations (npm run db:migrate against the Neon dev branch first, then production). Do not touch any live database without asking. Show me the plan first.
```

After it's done: run the migration on the `dev` branch, check the tables in the Neon console, then:

```powershell
git add -A
git commit -m "Database schema and migrations"
git push
```

### Step 7. Claude Code: the marketing homepage

```
Replace the template's placeholder homepage. Keep using its Section, Container, Header and Footer structure and the site-config driven SEO, restyled with the Grove tokens. Build the public homepage at "/" to match the "site" view of design/grove-prototype.html and the Claude Design export in design/screens/ if present. Sections: sticky nav, hero with the interactive Today card (client component: tap tasks to check them off, shows "All clear" when done), Why grove with the typical-CRM versus grove sidebar toggle, a four-tab tour (a Follow-ups simulator, Pipeline, Profiles, On your phone), How it works (3 steps), origin story, FAQ using <details> (include "What is Grove?" explaining it is a customer management system), waitlist form, footer with "A product from Evergreen Digital Co." and thegrovecms.com.
Rules: the waitlist form posts to a server action that validates the email, lowercases it, inserts into waitlist_signups, and shows a friendly success or "already on the list" state. Hero highlight on "nothing" must stay readable in dark mode. No invented testimonials or numbers. Add metadata, Open Graph tags and a favicon from the logo. "Log in" and "Try the demo" go to /login (the demo is only the prototype, so label the button "Log in" in production). Must work at 390px wide with no horizontal scroll. Run build and lint, then commit "Marketing homepage".
```

Check: view it on your phone (same Wi-Fi, use the "Network" URL that `npm run dev` prints).

### Step 8. Claude Code: the follow-up engine (the brain)

Start a fresh session in **plan mode**. This is the step worth testing hardest.

```
Stages and cadences are data, not constants. The engine reads stage behavior (cadence_behavior, checkin_days, resurface_days, clears_tasks, group) and cadence_steps from the database and must never reference stage names like "client" or "recycle" in logic. Follow-up tasks carry the step's channel (email, call, text). Nothing sends automatically yet; tasks only remind a person. Tests should run against the agency template and one made-up template with different stages and days, to prove nothing is hardcoded.

Implement the follow-up cadence rules as pure, well-tested TypeScript in packages/core (cadence module), with services in apps/web/lib/services that load the data, call core, save the result, and thin server actions on top. Core receives today as a YYYY-MM-DD string computed in the workspace or user time zone. Use vitest. The rules are in CLAUDE.md under "Follow-up cadence" and are demonstrated in design/grove-prototype.html (see seed(), moveBiz(), completeTask(), snoozeTask(), markReplied()). The stage names below describe the agency template; in code, use the stage behavior fields instead.
- Adding a lead (default-new stage, cadence_active true) creates the first cadence step's follow-up, due created date + day_offset, with that step's channel.
- Completing a follow-up records the step in cadence_done; if the lead is in the default-new stage, move it to the next active stage (Reached Out); schedule the next step due created date + day_offset (if that date has passed, use today). After the last step, create a decide task titled "Decide: recycle or do not contact?". It is never auto-resolved and offers two actions: move to the recycle stage or the do-not-contact stage.
- "They replied": move to Contacted, set cadence_active false, delete pending followup and decide tasks, log a reply activity.
- Moving to a stage with cadence_behavior stop ends the cadence. Moving to a stage with checkin_days creates a client check-in that many days out (respecting the contact's checkin_frequency); completing one schedules the next; leaving that stage removes pending client tasks.
- Moving to a stage with resurface_days removes all pending tasks and creates a resurface task that many days out. Moving to a stage with clears_tasks removes all pending tasks.
- Moving back to a cadence_behavior start stage restarts the cadence from today.
- Snooze moves a task to tomorrow. Manual reminders carry a title, a day and an optional why note.
- Every stage change and task completion writes an activity row and updates last_activity_at.
- All dates are day-level. No times anywhere.
Write tests for every rule, including edge cases (overdue scheduling, final decide task, reply mid-cadence, client to do not contact, recycle then restart). Each action returns enough information for the UI to offer Undo. Run tests, build and lint, then commit "Cadence engine".
```

### Step 9. Claude Code: app shell, Today and Tasks

```
Build the signed-in app shell and the Today and Tasks pages to match the "app" view of design/grove-prototype.html and design/screens/.
- Shell: left sidebar with exactly four items (Today, Pipeline, Businesses, Tasks), a badge on Today counting my overdue plus due-today tasks, a light/dark toggle and a sign-out. Top bar with a search-or-jump button (Ctrl or Cmd K), a New lead button and my avatar. Under 820px hide the sidebar and show a bottom tab bar with a center add button.
- New lead modal: business name required, owner defaults to me, phone optional, everything else behind an "Add more details" fold. Creating a lead runs the cadence engine.
- Set a reminder modal: what, business, day (date only, minimum today), optional why.
- Today: greeting by time of day, Mine/Everyone toggle, Overdue and Due today groups, collapsed "Coming up" (next 7 days), a right rail with the "Your grove" stage bar and quick add. Empty state "You are all clear."
- Task row: check circle to complete (short leave animation), due pill, a Tomorrow snooze button on overdue or due-today, and for decide tasks the two buttons Recycle and Do not contact. Show each follow-up's channel (email, call, text) as a small icon on the task row.
- Every mutation shows a toast with Undo.
- Tasks page: Overdue, Today, This week, Later, and Recently done, with an owner filter.
Use real Neon data through apps/web/lib/services only, from server components and thin server actions. Every query is workspace-scoped. No client-side data waterfalls. Run build and lint, then commit "App shell, Today, Tasks".
```

Check: create your login with `npm run create-user`, run the seed, sign in, add a lead, complete Day 1, and confirm Day 3 appears.

### Step 10. Claude Code: Pipeline, Businesses and the profile drawer

```
Build the Pipeline page, the Businesses list and the business profile drawer to match design/grove-prototype.html.
- Pipeline: columns come from the workspace's pipeline_stages (group active and won as columns, group parked in a slim "Parked" panel), ordered by position. The Parked panel is collapsed by default and is also a drop target. Cards show name, niche, owner avatar and the next task due pill. Use dnd-kit for drag and drop, and give every card a Move button that opens a stage menu so it works on touch screens. Owner filter chips. Dropping a card runs the stage-change rules from @grove/core through the services layer and shows an Undo toast with a plain-language note (for example "Automatic follow-ups stopped, you take it from here.").
- Businesses: searchable table (name, niche, contact, phone), stage filter, sort by next follow-up or name. On mobile collapse to name, stage and next due.
- Profile drawer (right side, full screen on mobile): header with name, niche and source, a stage select listing the workspace's stages (not a fixed list) and an owner select, action buttons (Call as a tel: link, Log update, Reminder, and "They replied" only while the cadence is active). Sections: Next up (pending tasks), Follow-up plan (the contact's cadence steps with day and channel, done and next states, only while the cadence is active), Contact (inline view and edit: contact name and role, phone, email, website, socials), and three tabs: Notes and activity (notes textarea saving on blur, a one-line log box with call/text/email/note type, and a timeline), Site and plan (tier segmented control, check-in frequency for clients, how we found them, live site URL, launch date), and Files (upload to Vercel Blob through a server action that checks the workspace, serve files through the guarded download route, thumbnails).
- Open the drawer via a URL (for example /businesses/[id]) so links are shareable, and closing returns to the previous page.
Run build and lint, then commit "Pipeline, Businesses, profile drawer".
```

### Step 11. Claude Code: command palette, Sheets import and polish

```
Finish the "full power, nothing in the way" layer.
1. Command palette on Ctrl or Cmd K, and on "/" when not typing. Sections: Actions (Add a lead, Set a reminder, Go to Today, Pipeline, Businesses, Tasks, Switch theme, Import from CSV) and Businesses (fuzzy search by name, niche, contact). Arrow keys and Enter, Esc closes. Fully keyboard and screen-reader accessible.
2. CSV import at /import for my Google Sheets tracker: upload a CSV, map columns to fields with a preview and a dry run, dedupe by phone or name, choose an owner and a stage. Imported leads start the cadence from their created date, but any lead older than 14 days should land as a single decide task instead of a burst of overdue follow-ups.
3. Accessibility pass: focus states, aria labels on icon buttons, WCAG AA contrast in light and dark, prefers-reduced-motion.
4. Performance pass: check bundle size and remove anything unused.
5. A Playwright smoke test: log in, create a lead, complete Day 1, move a card, open the palette.
Run tests, build and lint, then commit "Command palette, import, polish".
```

### Step 12. Go live on thegrovecms.com

1. Vercel, Settings, Build and Deployment: Root Directory is `apps/web`. Settings, Environment Variables: confirm `DATABASE_URL` (production Neon branch), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (`https://thegrovecms.com`) and `BLOB_READ_WRITE_TOKEN` are set for Production.
2. Run the migration against production (`npm run db:migrate` with the production connection, per `docs/database.md`), then the Evergreen seed.
3. Create logins for Tegan, Canyon and Karl with `npm run create-user`, and add Canyon and Karl to the Evergreen workspace (manager or salesperson, your call).
4. Confirm the domain records from Phone setup are live (Vercel shows a green check on both domains).
5. Ask Claude Code for a production review:

```
Review the app for production readiness: environment variables never exposed to the client, every query goes through apps/web/lib/services and is workspace-scoped, packages/core has no next or react imports, role checks are enforced server-side, file downloads check the workspace, Better Auth sign-up is disabled, rate limiting on login, security headers in next.config, robots.txt and sitemap.xml, custom 404 and error pages, and proxy.ts uses an exact-match public route list. List anything to fix, fix the safe items, and commit.
```

**Cost note:** Vercel Hobby is for non-commercial use. Fine while building; move to Pro once Evergreen runs real business on Grove or you start selling. Neon's free tier should hold until paying customers.

### Step 13. Use it and prove it (60 days)

Grove gets sold once it is proven, so measure it:
- Everyone moves all leads into Grove. Sheets keeps billing.
- Track two numbers: **on-time follow-ups** (tasks completed on or before their due date) and **time from new lead to first outreach**. Compare against your Sheets period.
- Turn the result into a one-page case study for the site. Come back and I will help write it.

The roadmap after that: reporting (the activity log gives you the stage history it needs), the dealership template and pilot, the later-phase features listed at the top, and the iPhone app (Step 14).

### Step 14. The iPhone app (after the 60-day proof)

Because of the choices in `docs/decisions.md`, this is an add, not a rebuild. Outline, to be expanded into full prompts when you get here:
1. **API:** `/api/v1` route handlers in apps/web that wrap the existing services (same ctx, same zod schemas). Add Better Auth's Expo support and `grove://` to trustedOrigins.
2. **Sync:** a "changes since" endpoint per table using updated_at and deleted_at, so the phone keeps a local copy and works on bad signal.
3. **App:** Expo with Expo Router in apps/mobile, using @grove/core for the cadence rules and @grove/brand for colors and the logo. Screens mirror the web: Today, Pipeline, Businesses, Tasks, profile.
4. **Phone-only features:** push notifications for due follow-ups (a push_tokens table), QR scan-to-login for the desktop, camera uploads to Vercel Blob with short-lived tokens, tap-to-call and tap-to-text.
5. **Links:** universal links on thegrovecms.com so a shared `/businesses/[id]` link opens in the app.
6. **Ship:** EAS Build, TestFlight for Tegan, Canyon and Karl, then App Store review.

---

## Quick reference

**Order:** Repo (1) → Logo (2) → Screens (3) → Vercel and computer setup → Monorepo (4) → Tokens (5) → Database (6) → Homepage (7) → Cadence engine (8) → Shell, Today, Tasks (9) → Pipeline, Businesses, Drawer (10) → Palette, Import, Polish (11) → Go live (12) → Prove it (13) → iPhone app (14).

**Habits that keep Claude Code on track**
- Start each step in a fresh session. It reads `CLAUDE.md` on its own, and every prompt points it at `design/`.
- Use plan mode for Steps 4, 6, 8 and 14, and read the plan before approving.
- If Claude Code proposes putting logic in a component or server action, or importing next or react into packages/core, push back: that is what keeps the iPhone app cheap.
- After each step: run it, click through it beside the prototype, then commit and push.
- If something looks off, describe the difference against the prototype ("the drawer tabs should sit inside the card, like in the prototype's profile") instead of "make it better".
- If Claude Code gets stuck, paste the exact error and say which step you are on.

**Common Windows snags**
- `mkdir -p` and `ls -la` are Mac/Linux. In PowerShell use `mkdir` (one folder at a time) and `dir`.
- If PowerShell blocks a script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
- If `npm run dev` says the port is in use, close the other terminal or run `npm run dev -- -p 3001`.
