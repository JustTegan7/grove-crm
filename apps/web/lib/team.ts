import "server-only";
import type { Role } from "@grove/core";

/**
 * Who may create a login. Set GROVE_TEAM in Vercel, for example:
 *   tegan@example.com:owner,canyon@example.com:manager,karl@example.com:manager
 * Anyone not on this list is refused at sign-up, on the server.
 */
export function teamAllowlist(): Map<string, Role> {
  const out = new Map<string, Role>();
  for (const entry of (process.env.GROVE_TEAM ?? "").split(",")) {
    const [email, role] = entry.trim().split(":").map((s) => s?.trim());
    if (!email) continue;
    const r: Role = role === "owner" || role === "manager" ? role : "salesperson";
    out.set(email.toLowerCase(), r);
  }
  return out;
}
