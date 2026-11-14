import "server-only";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { db } from "./db";

/** Best guess at the caller's address behind Vercel's proxy. */
export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Counts a request against `key` and says whether it is allowed. One atomic upsert, so it holds across
 * serverless instances. A new window starts when the last one is older than `windowSeconds`.
 * If the database is unreachable this allows the request: the endpoint's own work will fail loudly anyway.
 */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const cutoff = now - windowSeconds * 1000;
  try {
    const res = await db().execute(sql`
      insert into rate_limit (id, key, count, last_request) values (${uuidv7()}, ${key}, 1, ${now})
      on conflict (key) do update set
        count = case when rate_limit.last_request < ${cutoff} then 1 else rate_limit.count + 1 end,
        last_request = case when rate_limit.last_request < ${cutoff} then ${now} else rate_limit.last_request end
      returning count`);
    const rows = (res as unknown as { rows?: { count: number }[] }).rows ?? (res as unknown as { count: number }[]);
    const count = Number(rows[0]?.count ?? 1);
    return count <= max;
  } catch {
    return true;
  }
}

export function tooManyRequests() {
  return Response.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429, headers: { "Retry-After": "60" } });
}
