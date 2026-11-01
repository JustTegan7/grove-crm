import "server-only";
import { and, asc, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { contacts, tasks } from "@grove/db";
import { addDays, createReminderInput, idInput, onComplete, onStageChange, snoozeDate, updateTaskInput } from "@grove/core";
import { z } from "zod";
import { db } from "../db";
import type { Ctx } from "./ctx";
import { applyEffects, openTasksFor, toState } from "./effects";
import { loadStages, loadSteps } from "./workspace";
import { makeUndo, undoForEffects } from "./undo";

const taskCols = {
  id: tasks.id,
  kind: tasks.kind,
  channel: tasks.channel,
  title: tasks.title,
  note: tasks.note,
  dueDate: tasks.dueDate,
  doneAt: tasks.doneAt,
  ownerId: tasks.ownerId,
  contactId: tasks.contactId,
  contactName: contacts.name,
  contactPhone: contacts.phone,
};
export type TaskRow = {
  id: string;
  kind: "followup" | "decide" | "manual" | "client" | "resurface";
  channel: "email" | "call" | "text" | null;
  title: string;
  note: string | null;
  dueDate: string;
  doneAt: Date | null;
  ownerId: string;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
};

function baseOpen(ctx: Ctx, mine: boolean) {
  const c = [eq(tasks.workspaceId, ctx.workspace.id), isNull(tasks.doneAt), isNull(tasks.deletedAt)];
  if (mine) c.push(eq(tasks.ownerId, ctx.userId));
  return c;
}

/** Open tasks due on or before `until`. */
export async function listOpenTasks(ctx: Ctx, opts: { mine: boolean; until?: string; ownerId?: string }): Promise<TaskRow[]> {
  const conds = baseOpen(ctx, opts.mine);
  if (opts.ownerId) conds.push(eq(tasks.ownerId, opts.ownerId));
  if (opts.until) conds.push(lte(tasks.dueDate, opts.until));
  return db()
    .select(taskCols)
    .from(tasks)
    .leftJoin(contacts, eq(contacts.id, tasks.contactId))
    .where(and(...conds, sql`(${contacts.id} is null or ${contacts.deletedAt} is null)`))
    .orderBy(asc(tasks.dueDate), asc(tasks.createdAt))
    .limit(500);
}

export async function listRecentlyDone(ctx: Ctx, opts: { ownerId?: string }): Promise<TaskRow[]> {
  const conds = [eq(tasks.workspaceId, ctx.workspace.id), isNotNull(tasks.doneAt), isNull(tasks.deletedAt), gte(tasks.dueDate, addDays(ctx.today, -14))];
  if (opts.ownerId) conds.push(eq(tasks.ownerId, opts.ownerId));
  return db()
    .select(taskCols)
    .from(tasks)
    .leftJoin(contacts, eq(contacts.id, tasks.contactId))
    .where(and(...conds))
    .orderBy(desc(tasks.doneAt))
    .limit(30);
}

export async function myDueCount(ctx: Ctx) {
  const [r] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(...baseOpen(ctx, true), lte(tasks.dueDate, ctx.today)));
  return r?.n ?? 0;
}

async function getTask(ctx: Ctx, id: string) {
  const [t] = await db()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, ctx.workspace.id), isNull(tasks.deletedAt)));
  if (!t) throw new Error("That task was not found.");
  return t;
}

export async function completeTask(ctx: Ctx, raw: unknown) {
  const { id } = idInput.parse(raw);
  const t = await getTask(ctx, id);
  if (t.doneAt) return { message: "Already done." };
  const done = db().update(tasks).set({ doneAt: new Date() }).where(eq(tasks.id, id));

  if (!t.contactId) {
    await done;
    return { message: "Done.", undo: makeUndo(ctx, { reopenTaskId: id }) };
  }
  const [c] = await db().select().from(contacts).where(and(eq(contacts.id, t.contactId), eq(contacts.workspaceId, ctx.workspace.id)));
  const [stages, steps] = await Promise.all([loadStages(ctx.workspace.id), loadSteps(ctx.workspace.id)]);
  const fx = onComplete({
    task: { id: t.id, kind: t.kind, cadenceStepId: t.cadenceStepId, dueDate: t.dueDate },
    contact: toState(c),
    stages,
    steps,
    today: ctx.today,
  });
  fx.activities.unshift({ type: "system", body: `Completed: ${t.title}` });
  const applied = await applyEffects(ctx, c.id, fx, [done as never]);
  return { message: fx.message, undo: undoForEffects(ctx, c, applied, fx.cancelTaskIds, { reopenTaskId: id }) };
}

export async function snoozeTask(ctx: Ctx, raw: unknown) {
  const { id } = idInput.parse(raw);
  const t = await getTask(ctx, id);
  await db().update(tasks).set({ dueDate: snoozeDate(ctx.today) }).where(and(eq(tasks.id, id), eq(tasks.workspaceId, ctx.workspace.id)));
  return { message: "Moved to tomorrow.", undo: makeUndo(ctx, { taskDue: { id, dueDate: t.dueDate } }) };
}

export async function createReminder(ctx: Ctx, raw: unknown) {
  const input = createReminderInput.parse(raw);
  if (input.dueDate < ctx.today) throw new Error("Pick today or a later day.");
  let ownerId = ctx.userId;
  if (input.contactId) {
    const [c] = await db()
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, input.contactId), eq(contacts.workspaceId, ctx.workspace.id), isNull(contacts.deletedAt)));
    if (!c) throw new Error("That business was not found.");
    ownerId = ctx.userId;
  }
  await db().insert(tasks).values({
    workspaceId: ctx.workspace.id,
    contactId: input.contactId ?? null,
    kind: "manual",
    title: input.title,
    note: input.note,
    dueDate: input.dueDate,
    ownerId,
    createdBy: ctx.userId,
  });
  return { message: "Reminder set." };
}

const decideInput = z.object({ id: z.string().uuid(), choice: z.enum(["recycle", "dnc"]) });

/** The two buttons on a decide task. Targets are found by stage behavior, not by name. */
export async function decide(ctx: Ctx, raw: unknown) {
  const { id, choice } = decideInput.parse(raw);
  const t = await getTask(ctx, id);
  if (!t.contactId) throw new Error("This task has no business.");
  const [c] = await db().select().from(contacts).where(and(eq(contacts.id, t.contactId), eq(contacts.workspaceId, ctx.workspace.id)));
  const [stages, steps, openTasks] = await Promise.all([loadStages(ctx.workspace.id), loadSteps(ctx.workspace.id), openTasksFor(ctx, c.id)]);
  const parked = stages.filter((s) => s.group === "parked");
  const to = choice === "recycle" ? parked.find((s) => s.resurfaceDays != null) : parked.find((s) => s.clearsTasks && s.resurfaceDays == null);
  const from = stages.find((s) => s.id === c.stageId);
  if (!to || !from) throw new Error("This workspace has no stage for that.");
  const fx = onStageChange({ contact: toState(c), from, to, openTasks, steps, today: ctx.today });
  const done = db().update(tasks).set({ doneAt: new Date() }).where(eq(tasks.id, id));
  const cancelled = fx.cancelTaskIds.filter((x) => x !== id);
  const applied = await applyEffects(ctx, c.id, { ...fx, cancelTaskIds: cancelled }, [done as never]);
  return { message: fx.message, undo: undoForEffects(ctx, c, applied, cancelled, { reopenTaskId: id }) };
}

/** Change a task's day and note. Only reminders you set yourself can be renamed. */
export async function updateTask(ctx: Ctx, raw: unknown) {
  const input = updateTaskInput.parse(raw);
  const t = await getTask(ctx, input.id);
  if (t.doneAt) throw new Error("That task is already done.");
  if (input.dueDate < ctx.today) throw new Error("Pick today or a later day.");
  const title = t.kind === "manual" && input.title ? input.title : t.title;
  await db()
    .update(tasks)
    .set({ dueDate: input.dueDate, note: input.note, title })
    .where(and(eq(tasks.id, t.id), eq(tasks.workspaceId, ctx.workspace.id)));
  return { message: "Task updated.", undo: makeUndo(ctx, { taskEdit: { id: t.id, title: t.title, note: t.note, dueDate: t.dueDate } }) };
}

/** Delete a reminder you set. Follow-ups, check-ins and decide tasks come from the cadence and cannot be deleted. */
export async function deleteTask(ctx: Ctx, raw: unknown) {
  const { id } = idInput.parse(raw);
  const t = await getTask(ctx, id);
  if (t.kind !== "manual") throw new Error("Only reminders can be deleted. Snooze or move the business instead.");
  await db().update(tasks).set({ deletedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.workspaceId, ctx.workspace.id)));
  return { message: "Reminder deleted.", undo: makeUndo(ctx, { restoreTaskIds: [id] }) };
}
