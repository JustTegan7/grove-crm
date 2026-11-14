import type { Metadata } from "next";
import { getCtx } from "../../../lib/services/ctx";
import { listMessageTemplates } from "../../../lib/services/messages";
import { TemplateEditor } from "../../../components/app/TemplateEditor";

export const metadata: Metadata = { title: "Message templates" };

export default async function TemplatesPage() {
  const ctx = await getCtx();
  if (ctx.role === "salesperson") {
    return (
      <div>
        <h1 className="text-3xl font-bold">Message templates</h1>
        <p className="card mt-6 p-10 text-center text-muted">Only owners and managers can edit message templates.</p>
      </div>
    );
  }
  const templates = await listMessageTemplates(ctx);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Message templates</h1>
        <p className="mt-1 text-sm text-muted">
          The wording your team starts from for each follow-up. A template with a cadence day is used for that day on that channel. Fields like {"{{business}}"} fill in per lead.
        </p>
      </div>
      <ul className="space-y-3">
        {templates.map((t) => <TemplateEditor key={t.id} template={t} />)}
      </ul>
      <section aria-labelledby="h-new">
        <h2 id="h-new" className="mb-3 font-bold">Add a template</h2>
        <ul><TemplateEditor /></ul>
      </section>
    </div>
  );
}
