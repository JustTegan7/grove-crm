import { api, json } from "../../../../../lib/api/handler";
import { approveQrLogin } from "../../../../../lib/services/qr";

export const POST = api(async (ctx, request) => approveQrLogin(ctx, request, (await json(request)).code));
