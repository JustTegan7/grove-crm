import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { workspaces } from "@grove/db";
import { VISIBILITY } from "@grove/core";
import { db } from "../db";
import { requireRole, type Ctx } from "./ctx";

const visibilityInput = z.object({ visibility: z.enum(VISIBILITY) });

/** Owners choose whether salespeople see the whole workspace or only their own businesses and tasks. */
export async function setVisibility(ctx: Ctx, raw: unknown) {
  requireRole(ctx, ["owner"]);
  const { visibility } = visibilityInput.parse(raw);
  await db().update(workspaces).set({ visibility }).where(eq(workspaces.id, ctx.workspace.id));
  return { message: visibility === "own" ? "Salespeople now see only their own businesses and tasks." : "Everyone on the team now sees all businesses and tasks." };
}
