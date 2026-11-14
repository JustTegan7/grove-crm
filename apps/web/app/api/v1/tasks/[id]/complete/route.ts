import { api } from "../../../../../../lib/api/handler";
import { completeTask } from "../../../../../../lib/services/tasks";

export const POST = api((ctx, _req, p) => completeTask(ctx, { id: p.id }));
