import type { Metadata } from "next";
import Link from "next/link";
import { getCtx } from "../../../lib/services/ctx";
import { listContacts } from "../../../lib/services/contacts";
import { loadMembers, loadStages } from "../../../lib/services/workspace";
import { DuePill } from "../../../components/app/TaskRow";

export const metadata: Metadata = { title: "Businesses" };

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string; sort?: string }> }) {
  const ctx = await getCtx();
  const sp = await searchParams;
  const [stages, members] = await Promise.all([loadStages(ctx.workspace.id), loadMembers(ctx.workspace.id)]);
  const stageId = sp.stage && stages.some((s) => s.id === sp.stage) ? sp.stage : undefined;
  const sort = sp.sort === "name" ? "name" : "next";
  const rows = await listContacts(ctx, { q: sp.q?.slice(0, 100), stageId, sort });

  return (
    <div>
      <h1 className="text-3xl font-bold">Businesses</h1>
      <form className="mt-4 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search</label>
        <input id="q" name="q" defaultValue={sp.q} placeholder="Search name, niche, contact, phone" className="input min-w-0 flex-1 sm:max-w-sm" />
        <label htmlFor="stage" className="sr-only">Stage</label>
        <select id="stage" name="stage" defaultValue={stageId ?? ""} className="input w-auto">
          <option value="">All stages</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <label htmlFor="sort" className="sr-only">Sort</label>
        <select id="sort" name="sort" defaultValue={sort} className="input w-auto">
          <option value="next">Next follow-up</option>
          <option value="name">Name</option>
        </select>
        <button className="btn btn-soft">Filter</button>
      </form>

      {rows.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-muted">{sp.q || stageId ? "No businesses match that." : "No businesses yet. Press New lead to add your first one."}</p>
      ) : (
        <div className="card mt-6 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="hidden px-4 py-3 md:table-cell">Contact</th>
                <th className="hidden px-4 py-3 md:table-cell">Phone</th>
                <th className="px-4 py-3">Stage</th>
                <th className="hidden px-4 py-3 sm:table-cell">Owner</th>
                <th className="px-4 py-3">Next</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = stages.find((x) => x.id === r.stageId);
                const m = members.find((x) => x.id === r.ownerId);
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <Link href={`/businesses/${r.id}`} className="font-semibold hover:underline">{r.name}</Link>
                      {r.niche && <p className="text-xs text-muted">{r.niche}</p>}
                    </td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">{r.contactName}</td>
                    <td className="hidden px-4 py-3 md:table-cell">{r.phone && <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a>}</td>
                    <td className="px-4 py-3">
                      {s && (
                        <span className="pill bg-surface-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                          {s.label}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">{m?.name}</td>
                    <td className="px-4 py-3">{r.nextDue ? <DuePill due={r.nextDue} today={ctx.today} /> : <span className="text-xs text-muted">None</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
