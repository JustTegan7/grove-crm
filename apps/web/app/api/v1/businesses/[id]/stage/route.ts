import { api, json } from "../../../../../../lib/api/handler";
import { moveStage } from "../../../../../../lib/services/contacts";

export const POST = api(async (ctx, req, p) => moveStage(ctx, { id: p.id, stageId: (await json(req)).stageId }));
