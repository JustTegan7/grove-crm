import "server-only";
import { del } from "@vercel/blob";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { activities, contactFiles, contacts, invites, memberships, messageTemplates, tasks, user, workspaces } from "@grove/db";
import { db } from "../db";
import type { Ctx } from "./ctx";

const ROLE_RANK = { owner: 0, manager: 1, salesperson: 2 } as const;
const input = z.object({ confirm: z.string() });

/**
 * Deletes the signed-in person's login. Apple and good privacy practice both require this.
 * - Alone in a workspace: the whole workspace and its files are deleted with them.
 * - Others remain: their businesses and tasks go to the highest-role teammate, who becomes an
 *   owner if the workspace would otherwise have none. Notes and history stay, without their name.
 */
export async function deleteAccount(ctx: Ctx, raw: unknown) {
  const { confirm } = input.parse(raw);
  if (confirm.trim().toLowerCase() !== ctx.email.toLowerCase()) throw new Error("Type your email address exactly to confirm.");

  const mine = await db().select().from(memberships).where(and(eq(memberships.userId, ctx.userId), isNull(memberships.deletedAt)));
  const blobPaths: string[] = [];

  for (const m of mine) {
    const others = await db()
      .select()
      .from(memberships)
      .where(and(eq(memberships.workspaceId, m.workspaceId), ne(memberships.userId, ctx.userId), isNull(memberships.deletedAt)))
      .orderBy(asc(memberships.createdAt));
    if (!others.length) {
      const files = await db().select({ path: contactFiles.blobPathname }).from(contactFiles).where(eq(contactFiles.workspaceId, m.workspaceId));
      blobPaths.push(...files.map((f) => f.path));
      await db().delete(workspaces).where(eq(workspaces.id, m.workspaceId)); // cascades to everything inside
      continue;
    }
    const heir = [...others].sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role])[0];
    await db().batch([
      db().update(contacts).set({ ownerId: heir.userId }).where(and(eq(contacts.workspaceId, m.workspaceId), eq(contacts.ownerId, ctx.userId))),
      db().update(tasks).set({ ownerId: heir.userId }).where(and(eq(tasks.workspaceId, m.workspaceId), eq(tasks.ownerId, ctx.userId))),
    ]);
    if (m.role === "owner" && !others.some((o) => o.role === "owner")) {
      await db().update(memberships).set({ role: "owner" }).where(eq(memberships.id, heir.id));
    }
  }

  // Anything else that points at this person loses the name but keeps the record.
  await db().batch([
    db().update(contacts).set({ createdBy: null }).where(eq(contacts.createdBy, ctx.userId)),
    db().update(tasks).set({ createdBy: null }).where(eq(tasks.createdBy, ctx.userId)),
    db().update(activities).set({ actorId: null }).where(eq(activities.actorId, ctx.userId)),
    db().update(contactFiles).set({ createdBy: null }).where(eq(contactFiles.createdBy, ctx.userId)),
    db().update(messageTemplates).set({ createdBy: null }).where(eq(messageTemplates.createdBy, ctx.userId)),
    db().update(invites).set({ invitedBy: null }).where(eq(invites.invitedBy, ctx.userId)),
  ]);
  await db().delete(user).where(eq(user.id, ctx.userId)); // cascades to sessions, logins and memberships

  if (blobPaths.length && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(blobPaths);
    } catch {
      // Best effort: the database is already clean, a leftover file is not reachable from the app.
    }
  }
  return { message: "Your account was deleted." };
}
