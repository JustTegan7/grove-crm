import type { Metadata } from "next";
import { getCtx } from "../../lib/services/ctx";
import { listContacts } from "../../lib/services/contacts";
import { myDueCount } from "../../lib/services/tasks";
import { loadMembers } from "../../lib/services/workspace";
import { Shell } from "../../components/app/Shell";
import { ToastProvider } from "../../components/app/Toast";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx();
  const [members, businesses, badge] = await Promise.all([
    loadMembers(ctx.workspace.id),
    listContacts(ctx, { sort: "name" }),
    myDueCount(ctx),
  ]);
  return (
    <ToastProvider>
      <Shell
        me={{ id: ctx.userId, name: ctx.name, role: ctx.role }}
        members={members.map((m) => ({ id: m.id, name: m.name, color: m.color, role: m.role }))}
        businesses={businesses.map((b) => ({ id: b.id, name: b.name, niche: b.niche, contactName: b.contactName }))}
        badge={badge}
        today={ctx.today}
        workspaceName={ctx.workspace.name}
      >
        {children}
      </Shell>
    </ToastProvider>
  );
}
