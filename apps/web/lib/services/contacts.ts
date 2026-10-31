import "server-only";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { activities, contacts, tasks } from "@grove/db";
import {
  assignOwnerInput,
  createContactInput,
  idInput,
  logActivityInput,
  moveStageInput,
  onCreate,
  onReplied,
  onStageChange,
  updateContactInput,
  type CreateContactInput,
} from "@grove/core";
import { db } from "../db";
import { requireRole, type Ctx } from "./ctx";
import { applyEffects, openTasksFor, toState } from "./effects";
import { loadMembers, loadStages, loadSteps } from "./workspace";

export class NotFoundError extends Error {}

async function getRow(ctx: Ctx, id: string) {
  const [row] = await db()
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.workspaceId, ctx.workspace.id), isNull(contacts.deletedAt)));
  if (!row) throw new NotFoundError("That business was not found.");
  return row;
}

async function ensureMember(ctx: Ctx, userId: string) {
  const members = await loadMembers(ctx.workspace.id);
  if (!members.some((m) => m.id === userId)) throw new Error("That person is not on this team.");
}

const nextDue = sql<string | null>`(select min(t.due_date)::text from tasks t where t.contact_id = "contacts"."id" and t.done_at is null and t.deleted_at is null)`;

export async function listContacts(ctx: Ctx, opts: { q?: string; stageId?: string; ownerId?: string; sort?: "next" | "name" } = {}) {
  const conds = [eq(contacts.workspaceId, ctx.workspace.id), isNull(contacts.deletedAt)];
  if (opts.q) {
    const q = `%${opts.q.replace(/[%_]/g, "")}%`;
    conds.push(or(ilike(contacts.name, q), ilike(contacts.niche, q), ilike(contacts.contactName, q), ilike(contacts.phone, q))!);
  }
  if (opts.stageId) conds.push(eq(contacts.stageId, opts.stageId));
  if (opts.ownerId) conds.push(eq(contacts.ownerId, opts.ownerId));
  return db()
    .select({
      id: contacts.id,
      name: contacts.name,
      niche: contacts.niche,
      contactName: contacts.contactName,
      phone: contacts.phone,
      stageId: contacts.stageId,
      ownerId: contacts.ownerId,
      tier: contacts.tier,
      nextDue,
    })
    .from(contacts)
    .where(and(...conds))
    .orderBy(opts.sort === "name" ? asc(contacts.name) : sql`${nextDue} asc nulls last`, asc(contacts.name))
    .limit(500);
}

export async function getContact(ctx: Ctx, id: string) {
  const row = await getRow(ctx, id);
  const [openTasks, history] = await Promise.all([
    db()
      .select()
      .from(tasks)
      .where(and(eq(tasks.contactId, id), eq(tasks.workspaceId, ctx.workspace.id), isNull(tasks.doneAt), isNull(tasks.deletedAt)))
      .orderBy(asc(tasks.dueDate)),
    db()
      .select()
      .from(activities)
      .where(and(eq(activities.contactId, id), eq(activities.workspaceId, ctx.workspace.id), isNull(activities.deletedAt)))
      .orderBy(desc(activities.createdAt))
      .limit(100),
  ]);
  return { contact: row, openTasks, history };
}

export async function createContact(ctx: Ctx, raw: CreateContactInput | Record<string, unknown>) {
  const input = createContactInput.parse(raw);
  const [stages, steps] = await Promise.all([loadStages(ctx.workspace.id), loadSteps(ctx.workspace.id)]);
  const stage = (input.stageId && stages.find((s) => s.id === input.stageId)) || stages.find((s) => s.isDefaultNew) || stages[0];
  const ownerId = input.ownerId ?? ctx.userId;
  if (ownerId !== ctx.userId) await ensureMember(ctx, ownerId);

  const [row] = await db()
    .insert(contacts)
    .values({
      workspaceId: ctx.workspace.id,
      name: input.name,
      niche: input.niche,
      source: input.source,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      website: input.website,
      stageId: stage.id,
      ownerId,
      createdBy: ctx.userId,
    })
    .returning();

  const fx = onCreate(toState(row), stage, steps, ctx.today);
  fx.activities.unshift({ type: "system", body: `Added to ${stage.label}` });
  await applyEffects(ctx, row.id, fx);
  return { id: row.id, message: fx.message || "Business added." };
}

export async function updateContact(ctx: Ctx, raw: unknown) {
  const { id, ...fields } = updateContactInput.parse(raw);
  await getRow(ctx, id);
  await db()
    .update(contacts)
    .set(fields)
    .where(and(eq(contacts.id, id), eq(contacts.workspaceId, ctx.workspace.id)));
  return { message: "Saved." };
}

export async function moveStage(ctx: Ctx, raw: unknown) {
  const { id, stageId } = moveStageInput.parse(raw);
  const row = await getRow(ctx, id);
  const [stages, steps, openTasks] = await Promise.all([loadStages(ctx.workspace.id), loadSteps(ctx.workspace.id), openTasksFor(ctx, id)]);
  const from = stages.find((s) => s.id === row.stageId);
  const to = stages.find((s) => s.id === stageId);
  if (!from || !to) throw new Error("Unknown stage.");
  const fx = onStageChange({ contact: toState(row), from, to, openTasks, steps, today: ctx.today });
  if (from.id === to.id) return { message: "" };
  await applyEffects(ctx, id, fx);
  return { message: fx.message };
}

export async function markReplied(ctx: Ctx, raw: unknown) {
  const { id } = idInput.parse(raw);
  const row = await getRow(ctx, id);
  const [stages, steps, openTasks] = await Promise.all([loadStages(ctx.workspace.id), loadSteps(ctx.workspace.id), openTasksFor(ctx, id)]);
  const fx = onReplied({ contact: toState(row), stages, openTasks, steps, today: ctx.today });
  await applyEffects(ctx, id, fx);
  return { message: fx.message };
}

export async function assignOwner(ctx: Ctx, raw: unknown) {
  const { id, ownerId } = assignOwnerInput.parse(raw);
  await getRow(ctx, id);
  await ensureMember(ctx, ownerId);
  await db().batch([
    db().update(contacts).set({ ownerId }).where(and(eq(contacts.id, id), eq(contacts.workspaceId, ctx.workspace.id))),
    // Open tasks follow the record's owner.
    db()
      .update(tasks)
      .set({ ownerId })
      .where(and(eq(tasks.contactId, id), eq(tasks.workspaceId, ctx.workspace.id), isNull(tasks.doneAt), isNull(tasks.deletedAt))),
  ]);
  return { message: "Owner updated." };
}

export async function logActivity(ctx: Ctx, raw: unknown) {
  const input = logActivityInput.parse(raw);
  await getRow(ctx, input.contactId);
  await db().batch([
    db().insert(activities).values({ ...input, workspaceId: ctx.workspace.id, actorId: ctx.userId }),
    db().update(contacts).set({ lastActivityAt: new Date() }).where(eq(contacts.id, input.contactId)),
  ]);
  return { message: "Logged." };
}

export async function deleteContact(ctx: Ctx, raw: unknown) {
  requireRole(ctx, ["owner", "manager"]);
  const { id } = idInput.parse(raw);
  await getRow(ctx, id);
  const now = new Date();
  await db().batch([
    db().update(contacts).set({ deletedAt: now }).where(and(eq(contacts.id, id), eq(contacts.workspaceId, ctx.workspace.id))),
    db().update(tasks).set({ deletedAt: now }).where(and(eq(tasks.contactId, id), isNull(tasks.deletedAt))),
  ]);
  return { message: "Business deleted." };
}

export async function stageCounts(ctx: Ctx) {
  return db()
    .select({ stageId: contacts.stageId, count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, ctx.workspace.id), isNull(contacts.deletedAt)))
    .groupBy(contacts.stageId);
}
