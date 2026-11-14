import { api, json } from "../../../../lib/api/handler";
import { deleteAccount } from "../../../../lib/services/account";

// DELETE /api/v1/account  { confirm: "<your email>" }
export const DELETE = api(async (ctx, request) => deleteAccount(ctx, await json(request)));
