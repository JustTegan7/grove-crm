import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { invites, user } from "@grove/db";
import { db } from "../db";
import { requireRole, type Ctx } from "./ctx";

const inviteInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Check the email")),
  role: z.enum(["manager", "salesperson"]),
});

export async function listInvites(ctx: Ctx) {
  requireRole(ctx, ["owner", "manager"]);
  return db()
    .select({ id: invites.id, email: invites.email, role: invites.role, acceptedAt: invites.acceptedAt })
    .from(invites)
    .where(and(eq(invites.workspaceId, ctx.workspace.id), isNull(invites.deletedAt)))
    .orderBy(desc(invites.createdAt));
}

/** Owners invite managers and salespeople. When that email signs up, they join this workspace. */
export async function inviteMember(ctx: Ctx, raw: unknown) {
  requireRole(ctx, ["owner"]);
  const { email, role } = inviteInput.parse(raw);
  const existing = await db().select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing.length) throw new Error("That person already has a Grove login. Ask them to contact support to move workspaces.");
  await db()
    .insert(invites)
    .values({ workspaceId: ctx.workspace.id, email, role, invitedBy: ctx.userId })
    .onConflictDoUpdate({ target: [invites.workspaceId, invites.email], set: { role, acceptedAt: null, deletedAt: null, invitedBy: ctx.userId } });
  return { message: `Invited ${email}. Tell them to sign up with that email.` };
}

export async function revokeInvite(ctx: Ctx, raw: unknown) {
  requireRole(ctx, ["owner"]);
  const { id } = z.object({ id: z.string().uuid() }).parse(raw);
  const res = await db()
    .update(invites)
    .set({ deletedAt: new Date() })
    .where(and(eq(invites.id, id), eq(invites.workspaceId, ctx.workspace.id), isNull(invites.acceptedAt)))
    .returning({ id: invites.id });
  if (!res.length) throw new Error("That invite is gone or already accepted.");
  return { message: "Invite removed." };
}
