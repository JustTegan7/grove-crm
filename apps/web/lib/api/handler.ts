import "server-only";
import { ZodError } from "zod";
import { ForbiddenError, getApiCtx, type Ctx } from "../services/ctx";
import { NotFoundError } from "../services/contacts";

type Params = Promise<Record<string, string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Wraps an /api/v1 handler: signs the caller in from the bearer token and turns errors into JSON. */
export function api(handler: (ctx: Ctx, request: Request, params: Record<string, string>) => Promise<unknown>) {
  return async (request: Request, { params }: { params: Params }) => {
    const p = await params;
    for (const [k, v] of Object.entries(p)) {
      if (k === "id" && !UUID.test(v)) return Response.json({ error: "Not found." }, { status: 404 });
    }
    const ctx = await getApiCtx(request);
    if (!ctx) return Response.json({ error: "Sign in required." }, { status: 401 });
    try {
      const out = await handler(ctx, request, p);
      return Response.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof ZodError) return Response.json({ error: e.issues[0]?.message ?? "Check the form." }, { status: 400 });
      if (e instanceof ForbiddenError) return Response.json({ error: e.message }, { status: 403 });
      if (e instanceof NotFoundError) return Response.json({ error: e.message }, { status: 404 });
      if (e instanceof Error) return Response.json({ error: e.message }, { status: 400 });
      return Response.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
}

/** Reads a JSON body, or an empty object when there is none. */
export async function json(request: Request): Promise<Record<string, unknown>> {
  try {
    const v = await request.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
