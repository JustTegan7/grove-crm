import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { cadenceSteps, memberships, pipelineStages, user, workspaces } from "@grove/db";
import { templates, type CadenceStepDef, type StageDef } from "@grove/core";
import { db } from "../db";
import { teamAllowlist } from "../team";

const MEMBER_COLORS = ["#4FB39C", "#E8B33A", "#7FC28A", "#C8643C", "#6C8CD5", "#B07CC6"];

/** Copies an industry template's stages and cadence into a new workspace. */
export async function createWorkspaceFromTemplate(name: string, templateKey = "agency") {
  const t = templates[templateKey];
  if (!t) throw new Error(`Unknown template ${templateKey}`);
  const [ws] = await db().insert(workspaces).values({ name, template: t.key }).returning();
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
  ]);
  return ws;
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
