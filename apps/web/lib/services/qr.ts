import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { qrLogins } from "@grove/db";
import { auth } from "../auth";
import { db } from "../db";
import type { Ctx } from "./ctx";

const LIFETIME_MS = 2 * 60 * 1000;
const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const B64URL = /^[A-Za-z0-9_-]{43}$/;

/** The web login page asks for a code to show as a QR, and a secret only it keeps for polling. */
export async function startQrLogin() {
  await db().delete(qrLogins).where(lt(qrLogins.expiresAt, new Date()));
  const code = token();
  const pollSecret = token();
  const expiresAt = new Date(Date.now() + LIFETIME_MS);
  await db().insert(qrLogins).values({ codeHash: sha(code), pollHash: sha(pollSecret), expiresAt });
  return { code, pollSecret, expiresAt: expiresAt.toISOString() };
}

/** The signed-in phone approves a scanned code. Only the person holding the phone's session can do this. */
export async function approveQrLogin(ctx: Ctx, request: Request, rawCode: unknown) {
  const code = String(rawCode ?? "");
  if (!B64URL.test(code)) throw new Error("That QR code is not valid.");
  const [row] = await db()
    .select()
    .from(qrLogins)
    .where(and(eq(qrLogins.codeHash, sha(code)), eq(qrLogins.status, "pending"), gt(qrLogins.expiresAt, new Date())));
  if (!row) throw new Error("That QR code expired. Refresh it on your computer and scan again.");
  const { token: ott } = await auth().api.generateOneTimeToken({ headers: request.headers });
  const claimed = await db()
    .update(qrLogins)
    .set({ status: "approved", userId: ctx.userId, oneTimeToken: ott })
    .where(and(eq(qrLogins.id, row.id), eq(qrLogins.status, "pending")))
    .returning({ id: qrLogins.id });
  if (!claimed.length) throw new Error("That QR code was already used.");
  return { message: "Approved. Your computer is logging in." };
}

/** The web page polls. Once approved, it receives the one-time token exactly once. */
export async function pollQrLogin(rawCode: unknown, rawSecret: unknown): Promise<{ status: "pending" | "expired" | "approved"; token?: string }> {
  const code = String(rawCode ?? "");
  const secret = String(rawSecret ?? "");
  if (!B64URL.test(code) || !B64URL.test(secret)) return { status: "expired" };
  const [row] = await db().select().from(qrLogins).where(eq(qrLogins.codeHash, sha(code)));
  if (!row || row.expiresAt <= new Date() || row.status === "used") return { status: "expired" };
  if (!timingSafeEqual(Buffer.from(sha(secret)), Buffer.from(row.pollHash))) return { status: "expired" };
  if (row.status === "pending") return { status: "pending" };
  // Approved: hand over the token once, then burn the row.
  const taken = await db()
    .update(qrLogins)
    .set({ status: "used", oneTimeToken: null })
    .where(and(eq(qrLogins.id, row.id), eq(qrLogins.status, "approved")))
    .returning({ id: qrLogins.id });
  if (!taken.length || !row.oneTimeToken) return { status: "expired" };
  return { status: "approved", token: row.oneTimeToken };
}
