import { api } from "../../../../lib/api/handler";
import { listMessageTemplates } from "../../../../lib/services/messages";
import { myDueCount } from "../../../../lib/services/tasks";
import { loadMembers, loadStages, loadSteps } from "../../../../lib/services/workspace";

// Everything the phone needs once after sign-in: who you are, the workspace's stages and team.
export const GET = api(async (ctx) => {
  const [stages, steps, members, templates, due] = await Promise.all([
    loadStages(ctx.workspace.id),
    loadSteps(ctx.workspace.id),
    loadMembers(ctx.workspace.id),
    listMessageTemplates(ctx),
    myDueCount(ctx),
  ]);
  return {
    user: { id: ctx.userId, name: ctx.name, email: ctx.email, role: ctx.role },
    workspace: ctx.workspace,
    today: ctx.today,
    dueCount: due,
    stages,
    steps,
    members,
    templates,
  };
});
