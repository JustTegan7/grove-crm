import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { messageTemplates } from "@grove/db";
import { firstName, renderMessage, unknownFields } from "@grove/core";
import { db } from "../db";
import { requireRole, type Ctx } from "./ctx";

export interface MessageTemplateView {
  id: string;
  name: string;
  channel: "email" | "call" | "text";
  day: number | null;
  subject: string | null;
  body: string;
}

export async function listMessageTemplates(ctx: Ctx): Promise<MessageTemplateView[]> {
  const rows = await db()
    .select()
    .from(messageTemplates)
    .where(and(eq(messageTemplates.workspaceId, ctx.workspace.id), isNull(messageTemplates.deletedAt)))
    .orderBy(asc(messageTemplates.day), asc(messageTemplates.createdAt));
  return rows.map((r) => ({ id: r.id, name: r.name, channel: r.channel, day: r.day, subject: r.subject, body: r.body }));
}

const text = (max: number) => z.string().trim().max(max);
const saveInput = z.object({
  id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  name: text(80).min(1, "Give the template a name"),
  channel: z.enum(["email", "call", "text"]),
  day: z.coerce.number().int().min(1).max(365).optional().or(z.literal("").transform(() => undefined)).transform((v) => v ?? null),
  subject: text(200).optional().transform((v) => (v ? v : null)),
  body: text(5000).min(1, "The message cannot be empty"),
});

/** Owners and managers edit the workspace's message templates. */
export async function saveMessageTemplate(ctx: Ctx, raw: unknown) {
  requireRole(ctx, ["owner", "manager"]);
  const input = saveInput.parse(raw);
  const bad = [...unknownFields(input.body), ...unknownFields(input.subject ?? "")];
  if (bad.length) throw new Error(`Unknown field ${bad.map((b) => `{{${b}}}`).join(", ")}. Check the spelling.`);
  const values = {
    name: input.name,
    channel: input.channel,
    day: input.day,
    subject: input.channel === "email" ? input.subject : null,
    body: input.body,
  };
  if (input.id) {
    const res = await db()
      .update(messageTemplates)
      .set(values)
      .where(and(eq(messageTemplates.id, input.id), eq(messageTemplates.workspaceId, ctx.workspace.id), isNull(messageTemplates.deletedAt)))
      .returning({ id: messageTemplates.id });
    if (!res.length) throw new Error("That template no longer exists.");
    return { message: "Template saved.", id: input.id };
  }
  const [row] = await db().insert(messageTemplates).values({ ...values, workspaceId: ctx.workspace.id, createdBy: ctx.userId }).returning({ id: messageTemplates.id });
  return { message: "Template added.", id: row.id };
}

export async function deleteMessageTemplate(ctx: Ctx, raw: unknown) {
  requireRole(ctx, ["owner", "manager"]);
  const { id } = z.object({ id: z.string().uuid() }).parse(raw);
  const res = await db()
    .update(messageTemplates)
    .set({ deletedAt: new Date() })
    .where(and(eq(messageTemplates.id, id), eq(messageTemplates.workspaceId, ctx.workspace.id), isNull(messageTemplates.deletedAt)))
    .returning({ id: messageTemplates.id });
  if (!res.length) throw new Error("That template no longer exists.");
  return { message: "Template deleted." };
}

/**
 * Picks the template for a task: an exact day and channel match first, then any
 * template for that channel with no day. Returns null when none fits.
 */
export function pickTemplate(all: MessageTemplateView[], channel: string, day: number | null) {
  const forChannel = all.filter((t) => t.channel === channel);
  return forChannel.find((t) => day != null && t.day === day) ?? forChannel.find((t) => t.day == null) ?? null;
}

export function fillTemplate(t: MessageTemplateView, v: { business: string; contactName: string | null; owner: string; company: string }) {
  const values = { business: v.business, contact: v.contactName, first_name: firstName(v.contactName), owner: firstName(v.owner) ?? v.owner, company: v.company };
  return { subject: t.subject ? renderMessage(t.subject, values) : null, body: renderMessage(t.body, values) };
}
