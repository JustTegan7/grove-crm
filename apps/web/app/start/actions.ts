"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { safeMessage } from "../../lib/safe-error";
import { auth } from "../../lib/auth";
import { startWorkspace } from "../../lib/services/workspace";

export async function startWorkspaceAction(f: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Please log in first." };
  try {
    await startWorkspace(session.user.id, { workspaceName: String(f.get("workspaceName") ?? ""), accountType: String(f.get("accountType") ?? "") });
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the form." };
    return { ok: false, error: safeMessage(e) };
  }
}
