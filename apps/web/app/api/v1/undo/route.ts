import { api, json } from "../../../../lib/api/handler";
import { applyUndo } from "../../../../lib/services/undo";

export const POST = api(async (ctx, request) => applyUndo(ctx, String((await json(request)).token ?? "")));
