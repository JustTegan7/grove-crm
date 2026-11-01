import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { schema } from "@grove/db";
import { db } from "./db";
import { teamAllowlist } from "./team";
import { joinDefaultWorkspace } from "./services/workspace";
import { sendEmail } from "./email";

// Lazily built so `next build` works before env vars exist.
function createAuth() {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
    // When the Expo app is added: add the expo() plugin and "grove://" here.
    trustedOrigins: [
      "https://thegrovecms.com",
      "https://www.thegrovecms.com",
      "https://grove-crm.vercel.app",
      ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
        .filter(Boolean)
        .map((h) => `https://${h}`),
    ],
    database: drizzleAdapter(db(), {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      // Reset links last an hour and sign the person out everywhere once used.
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your Grove password",
          text: `Hi ${user.name},\n\nUse this link to set a new Grove password. It works for one hour.\n\n${url}\n\nIf you did not ask for this, you can ignore this email.\n\nGrove`,
        });
      },
    },
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
