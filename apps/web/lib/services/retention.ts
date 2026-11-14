import "server-only";
import { and, eq, inArray, isNull, or, isNotNull } from "drizzle-orm";
import { activities, contacts, pipelineStages, workspaces } from "@grove/db";
import { RETENTION_DAYS, retentionDue, todayIn, type StageDef } from "@grove/core";
import { db } from "../db";

/** Retention only deletes anything when this is "on" on Vercel. Otherwise the job reports what it would clear. */
export function retentionEnabled() {
  return process.env.GROVE_RETENTION === "on";
}

export interface RetentionResult {
  dryRun: boolean;
  workspaces: number;
  businesses: number;
}

/**
 * Clears person details (contact name, role, phone, email, social) from businesses parked
 * for 28 days. System job for all workspaces, each handled with its own stages and time zone.
 */
export async function runRetention(now: Date, dryRun = !retentionEnabled()): Promise<RetentionResult> {
  const wss = await db().select({ id: workspaces.id, timezone: workspaces.timezone }).from(workspaces).where(isNull(workspaces.deletedAt));
  let total = 0;
  for (const ws of wss) {
    const stageRows = await db().select().from(pipelineStages).where(and(eq(pipelineStages.workspaceId, ws.id), isNull(pipelineStages.deletedAt)));
    const stages: StageDef[] = stageRows.map((r) => ({
      id: r.id, key: r.key, label: r.label, position: r.position, color: r.color, group: r.group, cadenceBehavior: r.cadenceBehavior,
      checkinDays: r.checkinDays, resurfaceDays: r.resurfaceDays, clearsTasks: r.clearsTasks, isDefaultNew: r.isDefaultNew,
    }));
    const parkedIds = stages.filter((s) => s.group === "parked").map((s) => s.id);
    if (!parkedIds.length) continue;
    const rows = await db()
      .select({ id: contacts.id, stageId: contacts.stageId, changed: contacts.stageChangedAt })
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, ws.id),
          isNull(contacts.deletedAt),
          inArray(contacts.stageId, parkedIds),
          or(isNotNull(contacts.contactName), isNotNull(contacts.contactRole), isNotNull(contacts.phone), isNotNull(contacts.email), isNotNull(contacts.social)),
        ),
      );
    const today = todayIn(ws.timezone, now);
    const due = retentionDue(
      rows.map((r) => ({ id: r.id, stageId: r.stageId, stageChangedOn: todayIn(ws.timezone, r.changed), hasDetails: true })),
      stages,
      today,
    );
    total += due.length;
    if (dryRun) continue;
    for (let i = 0; i < due.length; i += 100) {
      const ids = due.slice(i, i + 100);
      await db().batch([
        db()
          .update(contacts)
          .set({ contactName: null, contactRole: null, phone: null, email: null, social: null })
          .where(and(eq(contacts.workspaceId, ws.id), inArray(contacts.id, ids))),
        db()
          .insert(activities)
          .values(ids.map((contactId) => ({ workspaceId: ws.id, contactId, type: "system" as const, body: `Contact details cleared after ${RETENTION_DAYS} days parked.` }))),
      ]);
    }
  }
  return { dryRun, workspaces: wss.length, businesses: total };
}
