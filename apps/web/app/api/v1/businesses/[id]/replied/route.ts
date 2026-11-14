import { api } from "../../../../../../lib/api/handler";
import { markReplied } from "../../../../../../lib/services/contacts";

export const POST = api((ctx, _req, p) => markReplied(ctx, { id: p.id }));
