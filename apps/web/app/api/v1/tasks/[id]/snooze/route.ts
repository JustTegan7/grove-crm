import { api } from "../../../../../../lib/api/handler";
import { snoozeTask } from "../../../../../../lib/services/tasks";

export const POST = api((ctx, _req, p) => snoozeTask(ctx, { id: p.id }));
