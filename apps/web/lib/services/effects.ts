import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
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

/** Writes engine effects in one batch (Neon runs a batch as a single transaction). */
export async function applyEffects(ctx: Ctx, contactId: string, fx: Effects, extra: Parameters<ReturnType<typeof db>["batch"]>[0][number][] = []) {
  const d = db();
  const now = new Date();
  const queries: unknown[] = [...extra];

  if (fx.cancelTaskIds.length) {
    queries.push(
      d
        .update(tasks)
        .set({ deletedAt: now })
        .where(and(eq(tasks.workspaceId, ctx.workspace.id), inArray(tasks.id, fx.cancelTaskIds))),
    );
  }
  if (fx.createTasks.length) {
    queries.push(
      d.insert(tasks).values(
        fx.createTasks.map((t) => ({ ...t, workspaceId: ctx.workspace.id, contactId, createdBy: ctx.userId })),
      ),
    );
  }
  const patch: Partial<typeof contacts.$inferInsert> = { ...fx.contactPatch, lastActivityAt: now };
  if (fx.contactPatch.stageId) patch.stageChangedAt = now;
  queries.push(d.update(contacts).set(patch).where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, ctx.workspace.id))));
  if (fx.activities.length) {
    queries.push(
      d.insert(activities).values(
        fx.activities.map((a) => ({ ...a, workspaceId: ctx.workspace.id, contactId, actorId: ctx.userId })),
      ),
    );
  }
  // drizzle's batch wants a non-empty tuple
  await d.batch(queries as unknown as Parameters<typeof d.batch>[0]);
}
