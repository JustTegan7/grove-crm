"use server";

import { ZodError } from "zod";
import { safeMessage } from "../../lib/safe-error";
import { getCtx } from "../../lib/services/ctx";
import { createCheckout, createPortal } from "../../lib/services/billing";

type UrlResult = { ok: true; url: string } | { ok: false; error: string };

async function run(fn: () => Promise<{ url: string }>): Promise<UrlResult> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the form." };
    return { ok: false, error: safeMessage(e) };
  }
}

export async function checkoutAction(f: FormData) {
  const ctx = await getCtx();
  return run(() => createCheckout(ctx, Object.fromEntries([...f.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]))));
}

export async function portalAction() {
  const ctx = await getCtx();
  return run(() => createPortal(ctx));
}
