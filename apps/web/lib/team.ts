import "server-only";
import type { Role } from "@grove/core";

// The Evergreen Digital team. Anyone here can create a login with the role shown.
const DEFAULT_TEAM = [
  "tegan@evergreendigitalco.com:owner",
  "canyon@evergreendigitalco.com:manager",
  "karl@evergreendigitalco.com:manager",
].join(",");

/**
 * Who may create a login. DEFAULT_TEAM above, plus anyone in the GROVE_TEAM
 * env var on Vercel (same format: email:role, comma separated).
 * Anyone not on either list is refused at sign-up, on the server.
 */
export function teamAllowlist(): Map<string, Role> {
  const out = new Map<string, Role>();
  for (const entry of `${DEFAULT_TEAM},${process.env.GROVE_TEAM ?? ""}`.split(",")) {
    const [email, role] = entry.trim().split(":").map((s) => s?.trim());
    if (!email) continue;
    const r: Role = role === "owner" || role === "manager" ? role : "salesperson";
    if (!out.has(email.toLowerCase())) out.set(email.toLowerCase(), r);
  }
  return out;
}
