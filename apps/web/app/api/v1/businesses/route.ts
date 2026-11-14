import { api, json } from "../../../../lib/api/handler";
import { createContact, listContacts } from "../../../../lib/services/contacts";

// GET /api/v1/businesses?q=&stageId=&ownerId=&sort=name
export const GET = api(async (ctx, request) => {
  const u = new URL(request.url).searchParams;
  const rows = await listContacts(ctx, {
    q: u.get("q") ?? undefined,
    stageId: u.get("stageId") ?? undefined,
    ownerId: u.get("ownerId") ?? undefined,
    sort: u.get("sort") === "name" ? "name" : "next",
  });
  return { businesses: rows };
});

export const POST = api(async (ctx, request) => createContact(ctx, await json(request)));
