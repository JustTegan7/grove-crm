"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { IMPORT_FIELDS, IMPORT_MAX_BYTES, type ImportField } from "@grove/core";
import { analyzeImportAction, importContactsAction, previewImportAction } from "../../app/(app)/import/actions";

type Opt = { id: string; label: string; isDefaultNew?: boolean };
type Member = { id: string; name: string };

type Analysis = { headers: string[]; mapping: ImportField[]; sensitive: string[]; rowCount: number };
type Preview = {
  counts: { create: number; duplicates: number; errors: number };
  sample: { line: number; name: string; contactName: string | null; phone: string | null; email: string | null; stage: string; owner: string; createdOn: string }[];
  duplicates: { line: number; name: string; reason: string }[];
  errors: { line: number; error: string }[];
  stageValues: { value: string; stageId: string }[];
};
type Done = { created: number; duplicates: number; errors: number; message: string };

export function ImportWizard({ meId, stages, members }: { meId: string; stages: Opt[]; members: Member[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [mapping, setMapping] = useState<ImportField[]>([]);
  const [ownerId, setOwnerId] = useState(meId);
  const [stageId, setStageId] = useState(stages.find((s) => s.isDefaultNew)?.id ?? stages[0]?.id ?? "");
  const [stageMap, setStageMap] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const form = (extra?: object) => {
    const f = new FormData();
    if (file) f.set("file", file);
    if (extra) f.set("options", JSON.stringify(extra));
    return f;
  };
  const options = () => ({ mapping, defaultOwnerId: ownerId, defaultStageId: stageId, stageMap });

  function reset() {
    setFile(null);
    setAnalysis(null);
    setMapping([]);
    setStageMap({});
    setPreview(null);
    setDone(null);
    setError("");
  }

  function pick(f: File | null) {
    reset();
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) return setError("That is not a .csv file.");
    if (f.size > IMPORT_MAX_BYTES) return setError("That file is over 2 MB. Split it into smaller files.");
    setFile(f);
    const fd = new FormData();
    fd.set("file", f);
    start(async () => {
      const res = await analyzeImportAction(fd);
      if (!res.ok) return setError(res.error);
      setAnalysis(res.data);
      setMapping(res.data.mapping);
    });
  }

  function change(fn: () => void) {
    fn();
    setPreview(null);
    setError("");
  }

  function runPreview(map = stageMap) {
    setError("");
    start(async () => {
      const res = await previewImportAction(form({ ...options(), stageMap: map }));
      if (!res.ok) return setError(res.error);
      setPreview(res.data);
      setStageMap(Object.fromEntries(res.data.stageValues.map((v) => [v.value.toLowerCase(), v.stageId])));
    });
  }

  function runImport() {
    setError("");
    start(async () => {
      const res = await importContactsAction(form(options()));
      if (!res.ok) return setError(res.error);
      setDone(res.data);
    });
  }

  const hasName = mapping.includes("name");

  if (done) {
    return (
      <div className="card mt-6 p-8 text-center">
        <p className="text-2xl font-bold">{done.message}</p>
        <p className="mt-2 text-muted">
          {done.duplicates} {done.duplicates === 1 ? "duplicate" : "duplicates"} skipped, {done.errors} {done.errors === 1 ? "row" : "rows"} with errors left out.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/businesses" className="btn btn-primary">See Businesses</Link>
          <Link href="/today" className="btn btn-soft">Go to Today</Link>
          <button type="button" className="btn btn-ghost" onClick={reset}>Import another file</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="card p-5">
        <h2 className="font-semibold">1. Choose your file</h2>
        <p className="mt-1 text-sm text-muted">A .csv up to 2 MB. The file is read once and never saved.</p>
        <label htmlFor="csv" className="sr-only">CSV file</label>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          className="input mt-3"
          disabled={pending}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {analysis && <p className="mt-2 text-sm text-muted">{file?.name}: {analysis.rowCount} rows, {analysis.headers.length} columns.</p>}
      </section>

      {analysis && (
        <section className="card p-5">
          <h2 className="font-semibold">2. Match your columns</h2>
          <p className="mt-1 text-sm text-muted">We guessed the obvious ones. Business name is required.</p>
          {analysis.sensitive.length > 0 && (
            <p role="note" className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
              Grove never stores financing, credit, SSN or loan data, so these columns are skipped: <strong>{analysis.sensitive.join(", ")}</strong>.
            </p>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {analysis.headers.map((h, i) => {
              const locked = analysis.sensitive.includes(h);
              return (
                <div key={`${h}-${i}`} className="flex items-center gap-2">
                  <label htmlFor={`col-${i}`} className="min-w-0 flex-1 truncate text-sm font-semibold" title={h}>{h}</label>
                  <select
                    id={`col-${i}`}
                    className="input w-44"
                    value={locked ? "skip" : mapping[i]}
                    disabled={locked || pending}
                    onChange={(e) =>
                      change(() => {
                        const v = e.target.value as ImportField;
                        setMapping((m) => m.map((x, j) => (j === i ? v : v !== "skip" && x === v ? "skip" : x)));
                        if (v === "stage" || mapping[i] === "stage") setStageMap({});
                      })
                    }
                  >
                    {IMPORT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="owner" className="label">Owner for every imported business</label>
              <select id="owner" className="input" value={ownerId} disabled={pending} onChange={(e) => change(() => setOwnerId(e.target.value))}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="stage" className="label">Default stage</label>
              <select id="stage" className="input" value={stageId} disabled={pending} onChange={(e) => change(() => setStageId(e.target.value))}>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">Leads 14 or more days old in a follow-up stage come in as one decide task, not a pile of overdue follow-ups.</p>

          <div className="mt-5 flex items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={!hasName || pending} onClick={() => runPreview()}>
              {pending ? "Working..." : "Preview import"}
            </button>
            {!hasName && <span className="text-sm text-muted">Pick the Business name column first.</span>}
          </div>
        </section>
      )}

      {preview && (
        <section className="card p-5">
          <h2 className="font-semibold">3. Check the dry run</h2>
          <p className="mt-1 text-sm text-muted">Nothing is saved yet.</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-surface-2 p-3"><dt className="text-xs text-muted">Will create</dt><dd className="text-2xl font-bold">{preview.counts.create}</dd></div>
            <div className="rounded-lg bg-surface-2 p-3"><dt className="text-xs text-muted">Duplicates skipped</dt><dd className="text-2xl font-bold">{preview.counts.duplicates}</dd></div>
            <div className="rounded-lg bg-surface-2 p-3"><dt className="text-xs text-muted">Rows with errors</dt><dd className="text-2xl font-bold">{preview.counts.errors}</dd></div>
          </dl>

          {preview.stageValues.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">Map your stage values</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {preview.stageValues.map((v, i) => (
                  <div key={v.value} className="flex items-center gap-2">
                    <label htmlFor={`sv-${i}`} className="min-w-0 flex-1 truncate text-sm">{v.value}</label>
                    <select
                      id={`sv-${i}`}
                      className="input w-44"
                      value={stageMap[v.value.toLowerCase()] ?? ""}
                      disabled={pending}
                      onChange={(e) => {
                        const next = { ...stageMap, [v.value.toLowerCase()]: e.target.value };
                        setStageMap(next);
                        runPreview(next);
                      }}
                    >
                      <option value="">Use default</option>
                      {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.errors.length > 0 && (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold">Rows with errors ({preview.counts.errors})</summary>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {preview.errors.map((e) => <li key={e.line}>Row {e.line}: {e.error}</li>)}
              </ul>
            </details>
          )}
          {preview.duplicates.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold">Duplicates ({preview.counts.duplicates})</summary>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {preview.duplicates.map((d) => <li key={d.line}>Row {d.line}: {d.name} ({d.reason.toLowerCase()})</li>)}
              </ul>
            </details>
          )}

          {preview.sample.length > 0 && (
            <div className="mt-5 overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Business</th>
                    <th className="hidden px-3 py-2 md:table-cell">Contact</th>
                    <th className="hidden px-3 py-2 md:table-cell">Phone</th>
                    <th className="px-3 py-2">Stage</th>
                    <th className="hidden px-3 py-2 sm:table-cell">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((r) => (
                    <tr key={r.line} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-muted">{r.line}</td>
                      <td className="px-3 py-2 font-semibold">{r.name}</td>
                      <td className="hidden px-3 py-2 text-muted md:table-cell">{r.contactName}</td>
                      <td className="hidden px-3 py-2 md:table-cell">{r.phone}</td>
                      <td className="px-3 py-2">{r.stage}</td>
                      <td className="hidden px-3 py-2 text-muted sm:table-cell">{r.createdOn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.counts.create > preview.sample.length && (
                <p className="border-t border-line px-3 py-2 text-xs text-muted">Showing the first {preview.sample.length} of {preview.counts.create}.</p>
              )}
            </div>
          )}

          <div className="mt-5">
            <button type="button" className="btn btn-primary" disabled={pending || preview.counts.create === 0} onClick={runImport}>
              {pending ? "Importing..." : `Import ${preview.counts.create} ${preview.counts.create === 1 ? "business" : "businesses"}`}
            </button>
          </div>
        </section>
      )}

      {error && <p role="alert" className="rounded-lg bg-surface-2 p-3 text-sm font-semibold text-overdue">{error}</p>}
    </div>
  );
}
