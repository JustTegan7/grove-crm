import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { activities, contacts, tasks } from "@grove/db";
import type { ContactState, Effects, OpenTask } from "@grove/core";
import { db } from "../db";
import type { Ctx } from "./ctx";

type ContactRow = typeof contacts.$inferSelect;

export function toState(c: ContactRow): ContactState {
  return {
    id: c.id,
    ownerId: c.ownerId,
    stageId: c.stageId,
    cadenceActive: c.cadenceActive,
    cadenceDone: c.cadenceDone,
    cadenceStartedOn: c.cadenceStartedOn,
    checkinFrequencyDays: c.checkinFrequencyDays,
  };
}

export async function openTasksFor(ctx: Ctx, contactId: string): Promise<OpenTask[]> {
  const rows = await db()
    .select({ id: tasks.id, kind: tasks.kind, cadenceStepId: tasks.cadenceStepId, dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(eq(tasks.workspaceId, ctx.workspace.id), eq(tasks.contactId, contactId), isNull(tasks.doneAt), isNull(tasks.deletedAt)));
  return rows;
}

export interface Applied {
  /** The contact's updated_at after this write, used to check undo is still safe. */
  at: Date;
  createdTaskIds: string[];
  activityIds: string[];
}

/** Writes engine effects in one batch (Neon runs a batch as a single transaction). */
export async function applyEffects(ctx: Ctx, contactId: string, fx: Effects, extra: Parameters<ReturnType<typeof db>["batch"]>[0][number][] = []): Promise<Applied> {
  const d = db();
  const now = new Date();
  const queries: unknown[] = [...extra];
  const newTasks = fx.createTasks.map((t) => ({ ...t, id: uuidv7(), workspaceId: ctx.workspace.id, contactId, createdBy: ctx.userId }));
  const newActivities = fx.activities.map((a) => ({ ...a, id: uuidv7(), workspaceId: ctx.workspace.id, contactId, actorId: ctx.userId }));

  if (fx.cancelTaskIds.length) {
    queries.push(
      d
        .update(tasks)
        .set({ deletedAt: now })
        .where(and(eq(tasks.workspaceId, ctx.workspace.id), inArray(tasks.id, fx.cancelTaskIds))),
    );
  }
  if (newTasks.length) queries.push(d.insert(tasks).values(newTasks));
  const patch: Partial<typeof contacts.$inferInsert> = { ...fx.contactPatch, lastActivityAt: now, updatedAt: now };
  if (fx.contactPatch.stageId) patch.stageChangedAt = now;
  queries.push(d.update(contacts).set(patch).where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, ctx.workspace.id))));
  if (newActivities.length) queries.push(d.insert(activities).values(newActivities));
  // drizzle's batch wants a non-empty tuple
  await d.batch(queries as unknown as Parameters<typeof d.batch>[0]);
  return { at: now, createdTaskIds: newTasks.map((t) => t.id), activityIds: newActivities.map((a) => a.id) };
}
