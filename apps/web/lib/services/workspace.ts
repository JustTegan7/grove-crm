import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { cadenceSteps, invites, memberships, messageTemplates, pipelineStages, subscriptions, user, workspaces } from "@grove/db";
import { ACCOUNT_TYPES, defaultMessageTemplates, defaultVisibility, templateForAccountType, templates, type AccountType, type CadenceStepDef, type StageDef } from "@grove/core";
import { db } from "../db";
import { billingEnabled } from "../stripe";
import { teamAllowlist } from "../team";

const MEMBER_COLORS = ["#4FB39C", "#E8B33A", "#7FC28A", "#C8643C", "#6C8CD5", "#B07CC6"];

/** Copies an industry template's stages, cadence and starter messages into a new workspace. */
export async function createWorkspaceFromTemplate(name: string, templateKey = "agency", accountType: AccountType = "small_business") {
  const t = templates[templateKey];
  if (!t) throw new Error(`Unknown template ${templateKey}`);
  const [ws] = await db().insert(workspaces).values({ name, template: t.key, accountType, visibility: defaultVisibility(accountType) }).returning();
  await db().batch([
    db()
      .insert(pipelineStages)
      .values(
        t.stages.map((s, i) => ({
          workspaceId: ws.id,
          key: s.key,
          label: s.label,
          position: i,
          color: s.color,
          group: s.group,
          cadenceBehavior: s.cadenceBehavior,
          checkinDays: s.checkinDays ?? null,
          resurfaceDays: s.resurfaceDays ?? null,
          clearsTasks: s.clearsTasks ?? false,
          isDefaultNew: s.isDefaultNew ?? false,
        })),
      ),
    db()
      .insert(cadenceSteps)
      .values(t.cadence.map((c, i) => ({ workspaceId: ws.id, day: c.day, channel: c.channel, position: i }))),
    db()
      .insert(messageTemplates)
      .values(defaultMessageTemplates.map((m) => ({ workspaceId: ws.id, name: m.name, channel: m.channel, day: m.day, subject: m.subject, body: m.body }))),
  ]);
  return ws;
}

/** True when anyone may create a workspace. Off until GROVE_OPEN_SIGNUP is "true" on Vercel. */
export function openSignupEnabled() {
  return process.env.GROVE_OPEN_SIGNUP === "true";
}

const startInput = z.object({
  workspaceName: z.string().trim().min(2, "Give your business a name").max(120),
  accountType: z.enum(ACCOUNT_TYPES),
});

/** A signed-in person with no workspace starts their own and becomes its owner. */
export async function startWorkspace(userId: string, raw: unknown) {
  if (!openSignupEnabled()) throw new Error("New workspaces are not open yet.");
  const { workspaceName, accountType } = startInput.parse(raw);
  const already = await db().select({ id: memberships.id }).from(memberships).where(and(eq(memberships.userId, userId), isNull(memberships.deletedAt))).limit(1);
  if (already.length) throw new Error("You already have a workspace.");
  const ws = await createWorkspaceFromTemplate(workspaceName, templateForAccountType[accountType], accountType);
  await db().insert(memberships).values({ workspaceId: ws.id, userId, role: "owner", color: MEMBER_COLORS[0] }).onConflictDoNothing();
  // With billing on, a new workspace waits for a card-required trial. With billing off it is free, as before.
  const on = billingEnabled();
  await db()
    .insert(subscriptions)
    .values({ workspaceId: ws.id, plan: on ? (accountType === "dealership" ? "dealership" : "solo") : "comped", status: on ? "incomplete" : "comped" })
    .onConflictDoNothing();
  return ws;
}

/** Whether an email has a pending invite. Used to let invited people sign up. */
export async function hasPendingInvite(email: string) {
  const rows = await db()
    .select({ id: invites.id })
    .from(invites)
    .where(and(eq(invites.email, email.toLowerCase()), isNull(invites.acceptedAt), isNull(invites.deletedAt)))
    .limit(1);
  return rows.length > 0;
}

/** Turns every pending invite for this email into a membership. */
export async function acceptInvites(userId: string, email: string) {
  const pending = await db()
    .select()
    .from(invites)
    .where(and(eq(invites.email, email.toLowerCase()), isNull(invites.acceptedAt), isNull(invites.deletedAt)));
  for (const inv of pending) {
    const existing = await db().select({ id: memberships.id }).from(memberships).where(eq(memberships.workspaceId, inv.workspaceId));
    await db().batch([
      db()
        .insert(memberships)
        .values({ workspaceId: inv.workspaceId, userId, role: inv.role, color: MEMBER_COLORS[existing.length % MEMBER_COLORS.length] })
        .onConflictDoNothing(),
      db().update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, inv.id)),
    ]);
  }
  if (pending.length) {
    // Loaded on demand because billing itself reads the member list from this file.
    const { syncSeats } = await import("./billing");
    for (const ws of new Set(pending.map((p) => p.workspaceId))) await syncSeats(ws);
  }
  return pending.length;
}

/**
 * Grove Lite runs one workspace (Evergreen Digital). New team members join it
 * with the role from GROVE_TEAM. Creates the workspace on the first sign-up.
 */
export async function joinDefaultWorkspace(userId: string, email: string) {
  const role = teamAllowlist().get(email.toLowerCase()) ?? "salesperson";
  let [ws] = await db().select().from(workspaces).where(isNull(workspaces.deletedAt)).orderBy(asc(workspaces.createdAt)).limit(1);
  if (!ws) ws = await createWorkspaceFromTemplate(process.env.GROVE_WORKSPACE_NAME ?? "Evergreen Digital");
  const existing = await db().select({ id: memberships.id }).from(memberships).where(eq(memberships.workspaceId, ws.id));
  await db()
    .insert(memberships)
    .values({ workspaceId: ws.id, userId, role, color: MEMBER_COLORS[existing.length % MEMBER_COLORS.length] })
    .onConflictDoNothing();
  return ws;
}

export async function loadStages(workspaceId: string): Promise<StageDef[]> {
  const rows = await db()
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.workspaceId, workspaceId), isNull(pipelineStages.deletedAt)))
    .orderBy(asc(pipelineStages.position));
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    position: r.position,
    color: r.color,
    group: r.group,
    cadenceBehavior: r.cadenceBehavior,
    checkinDays: r.checkinDays,
    resurfaceDays: r.resurfaceDays,
    clearsTasks: r.clearsTasks,
    isDefaultNew: r.isDefaultNew,
  }));
}

export async function loadSteps(workspaceId: string): Promise<CadenceStepDef[]> {
  const rows = await db()
    .select()
    .from(cadenceSteps)
    .where(and(eq(cadenceSteps.workspaceId, workspaceId), isNull(cadenceSteps.deletedAt)))
    .orderBy(asc(cadenceSteps.position));
  return rows.map((r) => ({ id: r.id, day: r.day, channel: r.channel, position: r.position }));
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "salesperson";
  color: string;
}

export async function loadMembers(workspaceId: string): Promise<Member[]> {
  const rows = await db()
    .select({ id: user.id, name: user.name, email: user.email, role: memberships.role, color: memberships.color })
    .from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .where(and(eq(memberships.workspaceId, workspaceId), isNull(memberships.deletedAt)))
    .orderBy(asc(memberships.createdAt));
  return rows;
}
