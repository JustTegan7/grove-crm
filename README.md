# Grove

A CRM with nothing in the way. Live at https://thegrovecms.com.

## What is in Grove Lite
- Logins for the team (only emails on the `GROVE_TEAM` list can create one)
- **Today**: overdue and due-today follow-ups, Mine or Everyone
- **Pipeline**: drag cards between stages, or use each card's stage menu
- **Businesses**: searchable list and a full profile (contact info, socials, tier, site URL, launch date, check-in frequency, notes, activity log)
- **Tasks**: everything open, by owner
- Automatic follow-up plan: Day 1 email, Day 3 call, Day 5 text, Day 10 email, Day 14 call, then a "recycle or do not contact" decision. "They replied" stops it. Clients get monthly or every-other-month check-ins. Recycle Bin comes back as a task in 90 days.
- Manual reminders with a why note
- Marketing homepage with a waitlist

## Layout
```
apps/web        Next.js app: marketing site at / plus the signed-in app
apps/mobile     iPhone app later (Expo)
packages/core   cadence engine, dates, zod schemas (pure TypeScript, tested)
packages/db     Drizzle schema and migrations
packages/brand  colors, fonts, logo
docs/           decisions, playbook, SEO checklist
```

## Run it locally (Windows PowerShell)
```powershell
npm install
copy apps\web\.env.local.example apps\web\.env.local   # then fill it in, or: npx vercel env pull apps\web\.env.local
npm run db:migrate
npm run dev
```
Open http://localhost:3000.

## Vercel settings
- Root Directory: `apps/web`
- Build command: leave default. `apps/web` has a `vercel-build` script that runs migrations, then `next build`.
- Environment variables: `DATABASE_URL` (from the Neon integration), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (`https://thegrovecms.com`), `GROVE_TEAM`.

## Checks
`npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.
