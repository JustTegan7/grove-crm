import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { activities, contacts, tasks } from "@grove/db";
import { db } from "../db";
import type { Ctx } from "./ctx";
import type { Applied } from "./effects";

// Undo for the toast. A service records exactly what it changed, signs it,
// and hands the token to the browser. Undo verifies the signature, the
// workspace, the person and the time window, then puts things back.

const WINDOW_MS = 2 * 60 * 1000;

const plan = z.object({
  v: z.literal(1),
  ws: z.string(),
  uid: z.string(),
  exp: z.number(),
  contactId: z.string().uuid().optional(),
  /** Contact fields to restore. Dates are ISO strings. */
  before: z
    .object({
      stageId: z.string().uuid(),
      ownerId: z.string(),
      cadenceActive: z.boolean(),
      cadenceDone: z.array(z.string().uuid()),
      cadenceStartedOn: z.string().nullable(),
      stageChangedAt: z.string(),
      lastActivityAt: z.string().nullable(),
      deletedAt: z.string().nullable(),
    })
    .optional(),
  /** The contact's updated_at right after the action. If it changed since, undo is refused. */
  after: z.string().optional(),
  createdTaskIds: z.array(z.string().uuid()).default([]),
  restoreTaskIds: z.array(z.string().uuid()).default([]),
  reopenTaskId: z.string().uuid().optional(),
  taskDue: z.object({ id: z.string().uuid(), dueDate: z.string() }).optional(),
  taskOwners: z.array(z.object({ id: z.string().uuid(), ownerId: z.string() })).default([]),
  activityIds: z.array(z.string().uuid()).default([]),
});
export type UndoPlan = z.input<typeof plan>;

type ContactRow = typeof contacts.$inferSelect;

function secret() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("Undo is not configured.");
  return s;
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** Contact fields an undo can put back. */
export function snapshot(c: ContactRow): NonNullable<UndoPlan["before"]> {
  return {
    stageId: c.stageId,
    ownerId: c.ownerId,
    cadenceActive: c.cadenceActive,
    cadenceDone: c.cadenceDone,
    cadenceStartedOn: c.cadenceStartedOn,
    stageChangedAt: c.stageChangedAt.toISOString(),
    lastActivityAt: c.lastActivityAt?.toISOString() ?? null,
    deletedAt: c.deletedAt?.toISOString() ?? null,
  };
}

/** Builds a token from what an engine write changed. */
export function undoForEffects(ctx: Ctx, before: ContactRow, applied: Applied, cancelled: string[], extra: Partial<UndoPlan> = {}) {
  return makeUndo(ctx, {
    contactId: before.id,
    before: snapshot(before),
    after: applied.at.toISOString(),
    createdTaskIds: applied.createdTaskIds,
    restoreTaskIds: cancelled,
    activityIds: applied.activityIds,
    ...extra,
  });
}

export function makeUndo(ctx: Ctx, p: Omit<UndoPlan, "v" | "ws" | "uid" | "exp">): string {
  const full: UndoPlan = { v: 1, ws: ctx.workspace.id, uid: ctx.userId, exp: Date.now() + WINDOW_MS, ...p };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export class UndoError extends Error {}

export function readUndo(ctx: Ctx, token: unknown) {
  if (typeof token !== "string" || !token.includes(".")) throw new UndoError("That undo is not valid.");
  const [body, sig] = token.split(".");
  const want = Buffer.from(sign(body));
  const got = Buffer.from(sig ?? "");
  if (want.length !== got.length || !timingSafeEqual(want, got)) throw new UndoError("That undo is not valid.");
  const p = plan.parse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
  if (p.ws !== ctx.workspace.id || p.uid !== ctx.userId) throw new UndoError("That undo is not yours.");
  if (Date.now() > p.exp) throw new UndoError("Too late to undo that one.");
  return p;
}

export async function applyUndo(ctx: Ctx, token: unknown) {
  const p = readUndo(ctx, token);
  const d = db();
  const ws = ctx.workspace.id;
  const now = new Date();
  const queries: unknown[] = [];

  if (p.contactId && p.before) {
    const [c] = await d.select({ updatedAt: contacts.updatedAt }).from(contacts).where(and(eq(contacts.id, p.contactId), eq(contacts.workspaceId, ws)));
    if (!c) throw new UndoError("That business is gone.");
    if (p.after && c.updatedAt.getTime() !== new Date(p.after).getTime()) {
      throw new UndoError("Too late to undo. This business changed since.");
    }
    const b = p.before;
    queries.push(
      d
        .update(contacts)
        .set({
          stageId: b.stageId,
          ownerId: b.ownerId,
          cadenceActive: b.cadenceActive,
          cadenceDone: b.cadenceDone,
          cadenceStartedOn: b.cadenceStartedOn,
          stageChangedAt: new Date(b.stageChangedAt),
          lastActivityAt: b.lastActivityAt ? new Date(b.lastActivityAt) : null,
          deletedAt: b.deletedAt ? new Date(b.deletedAt) : null,
        })
        .where(and(eq(contacts.id, p.contactId), eq(contacts.workspaceId, ws))),
    );
  }
  if (p.createdTaskIds.length) {
    queries.push(d.update(tasks).set({ deletedAt: now }).where(and(eq(tasks.workspaceId, ws), inArray(tasks.id, p.createdTaskIds))));
  }
  if (p.restoreTaskIds.length) {
    queries.push(d.update(tasks).set({ deletedAt: null }).where(and(eq(tasks.workspaceId, ws), inArray(tasks.id, p.restoreTaskIds))));
  }
  if (p.reopenTaskId) {
    queries.push(d.update(tasks).set({ doneAt: null }).where(and(eq(tasks.workspaceId, ws), eq(tasks.id, p.reopenTaskId))));
  }
  if (p.taskDue) {
    queries.push(
      d
        .update(tasks)
        .set({ dueDate: p.taskDue.dueDate })
        .where(and(eq(tasks.workspaceId, ws), eq(tasks.id, p.taskDue.id), isNull(tasks.doneAt))),
    );
  }
  for (const t of p.taskOwners) {
    queries.push(d.update(tasks).set({ ownerId: t.ownerId }).where(and(eq(tasks.workspaceId, ws), eq(tasks.id, t.id))));
  }
  if (p.activityIds.length) {
    queries.push(d.update(activities).set({ deletedAt: now }).where(and(eq(activities.workspaceId, ws), inArray(activities.id, p.activityIds))));
  }
  if (!queries.length) return { message: "Nothing to undo." };
  await d.batch(queries as unknown as Parameters<typeof d.batch>[0]);
  return { message: "Undone." };
}
