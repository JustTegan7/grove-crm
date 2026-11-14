import { addDays } from "@grove/core";
import { api } from "../../../../lib/api/handler";
import { listMessageTemplates } from "../../../../lib/services/messages";
import { listOpenTasks } from "../../../../lib/services/tasks";
import { loadMembers } from "../../../../lib/services/workspace";
import { toTaskView } from "../../../../lib/views";

// GET /api/v1/tasks?scope=mine|all  (open tasks due within 7 days, plus anything overdue)
export const GET = api(async (ctx, request) => {
  const scope = new URL(request.url).searchParams.get("scope");
  const [open, members, templates] = await Promise.all([
    listOpenTasks(ctx, { mine: scope !== "all", until: addDays(ctx.today, 7) }),
    loadMembers(ctx.workspace.id),
    listMessageTemplates(ctx),
  ]);
  const source = { templates, company: ctx.workspace.name, sender: ctx.name };
  return { today: ctx.today, tasks: open.map((t) => toTaskView(t, members, source)) };
});
