"use server";

import { z } from "zod";
import { waitlistSignups } from "@grove/db";
import { db } from "../../lib/db";

export type WaitlistState = { status: "idle" | "ok" | "exists" | "error"; message?: string };

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const parsed = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { status: "error", message: "That email does not look right." };
  try {
    const rows = await db().insert(waitlistSignups).values({ email: parsed.data }).onConflictDoNothing().returning({ id: waitlistSignups.id });
    return { status: rows.length ? "ok" : "exists" };
  } catch {
    return { status: "error", message: "Could not save that right now. Try again in a minute." };
  }
}
