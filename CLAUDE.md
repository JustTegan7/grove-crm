# Grove

A customer management system (thegrovecms.com) from Evergreen Digital Co. Read `docs/decisions.md` before changing structure, and add to it whenever a decision is made.

## Stack
Next.js 16 App Router + TypeScript + Tailwind v4 (`apps/web`), Neon Postgres with Drizzle ORM and drizzle-kit migrations (`packages/db`), Better Auth (email and password, tables in Neon via the Drizzle adapter), hosted on Vercel with Root Directory `apps/web`. npm workspaces monorepo.

## Rules
- All data access happens on the server. Every read and write is a service function in `apps/web/lib/services` taking `(ctx, input)`, with input validated by a zod schema from `@grove/core`, and every query scoped to `ctx.workspace.id`. Server actions in `app/(app)/actions.ts` are thin wrappers. No business logic in components or actions.
- Domain rules (cadence, stage behavior, date math) live in `@grove/core` as pure functions. `today` is passed in, computed in the workspace or user time zone, never read from the server clock inside core. Core never imports next or react (a test enforces it).
- Pipeline stages and cadences are data per workspace. Never reference stage names in logic; use the stage fields (group, cadenceBehavior, checkinDays, resurfaceDays, clearsTasks, isDefaultNew).
- IDs are UUIDv7. Synced tables carry `updated_at` and `deleted_at` (soft delete).
- Grove never stores financing, credit, SSN or loan data.
- Day-level dates only (`YYYY-MM-DD`). No em dashes in UI copy or docs.
- Schema changes: edit `packages/db/src/schema.ts`, run `npm run db:generate`, commit the new migration. Vercel applies migrations on every deploy.
- Before committing: `npm run typecheck && npm test && npm run lint && npm run build`.
