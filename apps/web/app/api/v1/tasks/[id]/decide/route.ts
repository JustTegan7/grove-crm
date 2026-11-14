import { api, json } from "../../../../../../lib/api/handler";
import { decide } from "../../../../../../lib/services/tasks";

export const POST = api(async (ctx, req, p) => decide(ctx, { id: p.id, choice: (await json(req)).choice }));
