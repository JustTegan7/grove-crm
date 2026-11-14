import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { memberships, pushDevices, tasks, user, workspaces } from "@grove/db";
import { todayIn } from "@grove/core";
import { db } from "../db";
import type { Ctx } from "./ctx";

const tokenInput = z.object({ token: z.string().min(10).max(300).regex(/^(Expo|Exponent)PushToken\[.+\]$/, "That is not a push token."), platform: z.string().max(20).default("ios") });

/** Remembers this phone so Grove can send it reminders. Re-registering the same token just refreshes it. */
export async function registerDevice(ctx: Ctx, raw: unknown) {
  const { token, platform } = tokenInput.parse(raw);
  await db()
    .insert(pushDevices)
    .values({ userId: ctx.userId, token, platform })
    .onConflictDoUpdate({ target: pushDevices.token, set: { userId: ctx.userId, platform, deletedAt: null, updatedAt: new Date() } });
  return { message: "Reminders are on." };
}

export async function unregisterDevice(ctx: Ctx, raw: unknown) {
  const { token } = z.object({ token: z.string().max(300) }).parse(raw);
  await db().update(pushDevices).set({ deletedAt: new Date() }).where(and(eq(pushDevices.token, token), eq(pushDevices.userId, ctx.userId)));
  return { message: "Reminders are off." };
}

const EXPO_PUSH = "https://exp.host/--/api/v2/push/send";

/**
 * The morning reminder: one push per person with tasks due or overdue today, counted in their own time zone.
 * Runs from the daily cron. Only people with a registered phone get anything.
 */
export async function sendMorningReminders(now = new Date()) {
  const devices = await db()
    .select({ userId: pushDevices.userId, token: pushDevices.token, tz: user.timezone })
    .from(pushDevices)
    .innerJoin(user, eq(user.id, pushDevices.userId))
    .where(isNull(pushDevices.deletedAt));
  if (!devices.length) return { sent: 0 };

  const userIds = [...new Set(devices.map((d) => d.userId))];
  const wsTz = await db()
    .select({ userId: memberships.userId, tz: workspaces.timezone })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
    .where(and(inArray(memberships.userId, userIds), isNull(memberships.deletedAt)));
  const tzOf = (userId: string, own: string | null) => own ?? wsTz.find((w) => w.userId === userId)?.tz ?? "America/Los_Angeles";

  const counts = await db()
    .select({ ownerId: tasks.ownerId, due: tasks.dueDate, n: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(inArray(tasks.ownerId, userIds), isNull(tasks.doneAt), isNull(tasks.deletedAt)))
    .groupBy(tasks.ownerId, tasks.dueDate);

  const messages: { to: string; title: string; body: string; sound: "default" }[] = [];
  for (const d of devices) {
    const today = todayIn(tzOf(d.userId, d.tz), now);
    const n = counts.filter((c) => c.ownerId === d.userId && c.due <= today).reduce((a, c) => a + c.n, 0);
    if (n === 0) continue;
    messages.push({ to: d.token, title: "Grove", body: n === 1 ? "You have 1 follow-up due today." : `You have ${n} follow-ups due today.`, sound: "default" });
  }
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(chunk) });
    if (res.ok) sent += chunk.length;
  }
  return { sent };
}
