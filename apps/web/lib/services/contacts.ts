import "server-only";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { activities, contacts, tasks } from "@grove/db";
import {
  assignOwnerInput,
  createContactInput,
  idInput,
  logActivityInput,
  moveStageInput,
  normalizeName,
  normalizePhone,
  onCreate,
  onReplied,
  onStageChange,
  updateContactInput,
  type CreateContactInput,
} from "@grove/core";
import { z } from "zod";
import { db } from "../db";
import { requireRole, type Ctx } from "./ctx";
import { applyEffects, openTasksFor, toState } from "./effects";
import { loadMembers, loadStages, loadSteps } from "./workspace";
import { makeUndo, snapshot, undoForEffects } from "./undo";

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
  const applied = await applyEffects(ctx, id, fx);
  return { message: fx.message, undo: undoForEffects(ctx, row, applied, fx.cancelTaskIds) };
}

export async function markReplied(ctx: Ctx, raw: unknown) {
  const { id } = idInput.parse(raw);
  const row = await getRow(ctx, id);
  const [stages, steps, openTasks] = await Promise.all([loadStages(ctx.workspace.id), loadSteps(ctx.workspace.id), openTasksFor(ctx, id)]);
  const fx = onReplied({ contact: toState(row), stages, openTasks, steps, today: ctx.today });
  const applied = await applyEffects(ctx, id, fx);
  return { message: fx.message, undo: undoForEffects(ctx, row, applied, fx.cancelTaskIds) };
}

export async function assignOwner(ctx: Ctx, raw: unknown) {
  const { id, ownerId } = assignOwnerInput.parse(raw);
  const row = await getRow(ctx, id);
  await ensureMember(ctx, ownerId);
  const open = await db()
    .select({ id: tasks.id, ownerId: tasks.ownerId })
    .from(tasks)
    .where(and(eq(tasks.contactId, id), eq(tasks.workspaceId, ctx.workspace.id), isNull(tasks.doneAt), isNull(tasks.deletedAt)));
  const at = new Date();
  await db().batch([
    db().update(contacts).set({ ownerId, updatedAt: at }).where(and(eq(contacts.id, id), eq(contacts.workspaceId, ctx.workspace.id))),
    // Open tasks follow the record's owner.
    db()
      .update(tasks)
      .set({ ownerId })
      .where(and(eq(tasks.contactId, id), eq(tasks.workspaceId, ctx.workspace.id), isNull(tasks.doneAt), isNull(tasks.deletedAt))),
  ]);
  return { message: "Owner updated.", undo: makeUndo(ctx, { contactId: id, before: snapshot(row), after: at.toISOString(), taskOwners: open }) };
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
  const row = await getRow(ctx, id);
  const live = await db()
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.contactId, id), eq(tasks.workspaceId, ctx.workspace.id), isNull(tasks.deletedAt)));
  const now = new Date();
  await db().batch([
    db().update(contacts).set({ deletedAt: now, updatedAt: now }).where(and(eq(contacts.id, id), eq(contacts.workspaceId, ctx.workspace.id))),
    db().update(tasks).set({ deletedAt: now }).where(and(eq(tasks.contactId, id), eq(tasks.workspaceId, ctx.workspace.id), isNull(tasks.deletedAt))),
  ]);
  return {
    message: "Business deleted.",
    undo: makeUndo(ctx, { contactId: id, before: snapshot(row), after: now.toISOString(), restoreTaskIds: live.map((t) => t.id) }),
  };
}

export async function stageCounts(ctx: Ctx) {
  return db()
    .select({ stageId: contacts.stageId, count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, ctx.workspace.id), isNull(contacts.deletedAt)))
    .groupBy(contacts.stageId);
}

/** Businesses that look like the one about to be added: same name, or same phone digits. */
export async function findDuplicates(ctx: Ctx, raw: unknown) {
  const input = z.object({ name: z.string().max(200).default(""), phone: z.string().max(40).default("") }).parse(raw);
  const name = normalizeName(input.name);
  const phone = normalizePhone(input.phone);
  const conds = [];
  if (name) conds.push(sql`regexp_replace(lower(trim(${contacts.name})), '\s+', ' ', 'g') = ${name}`);
  if (phone.length >= 7) conds.push(sql`right(regexp_replace(coalesce(${contacts.phone}, ''), '\D', '', 'g'), 10) = right(${phone}, 10)`);
  if (!conds.length) return [];
  const rows = await db()
    .select({ id: contacts.id, name: contacts.name, phone: contacts.phone })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, ctx.workspace.id), isNull(contacts.deletedAt), or(...conds)))
    .limit(5);
  return rows.map((r) => ({ id: r.id, name: r.name, reason: normalizeName(r.name) === name ? "same name" : "same phone" }));
}
