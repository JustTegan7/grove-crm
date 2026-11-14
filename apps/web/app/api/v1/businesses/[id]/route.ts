import { api, json } from "../../../../../lib/api/handler";
import { getContact, updateContact } from "../../../../../lib/services/contacts";
import { listFiles } from "../../../../../lib/services/files";

export const GET = api(async (ctx, _req, p) => {
  const [detail, files] = await Promise.all([getContact(ctx, p.id), listFiles(ctx, p.id)]);
  return { ...detail, files };
});

export const PATCH = api(async (ctx, request, p) => updateContact(ctx, { ...(await json(request)), id: p.id }));
