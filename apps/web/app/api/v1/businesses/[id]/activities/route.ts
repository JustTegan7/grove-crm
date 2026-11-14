import { api, json } from "../../../../../../lib/api/handler";
import { logActivity } from "../../../../../../lib/services/contacts";

export const POST = api(async (ctx, req, p) => logActivity(ctx, { ...(await json(req)), contactId: p.id }));
