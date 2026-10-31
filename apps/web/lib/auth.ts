import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { schema } from "@grove/db";
import { db } from "./db";
import { teamAllowlist } from "./team";
import { joinDefaultWorkspace } from "./services/workspace";

// Lazily built so `next build` works before env vars exist.
function createAuth() {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
    // When the Expo app is added: add the expo() plugin and "grove://" here.
    trustedOrigins: [
      "https://thegrovecms.com",
      "https://www.thegrovecms.com",
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ],
    database: drizzleAdapter(db(), {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    rateLimit: { enabled: true, window: 60, max: 30 },
    databaseHooks: {
      user: {
        create: {
          before: async (u) => {
            // Sign-up is open only to emails on the GROVE_TEAM list.
            if (!teamAllowlist().has(u.email.toLowerCase())) {
              throw new APIError("FORBIDDEN", { message: "This email is not on the Grove team list." });
            }
            return { data: u };
          },
          after: async (u) => {
            await joinDefaultWorkspace(u.id, u.email);
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let _auth: Auth | undefined;
export function auth(): Auth {
  if (!_auth) _auth = createAuth();
  return _auth;
}
