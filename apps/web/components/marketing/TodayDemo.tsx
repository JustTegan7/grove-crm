"use client";

import { useState } from "react";

const DEMO = [
  { id: 1, title: "Day 3 call", who: "Harbor Coffee", due: "Today", tone: "today" },
  { id: 2, title: "Day 1 email", who: "Mill Creek Dental", due: "Today", tone: "today" },
  { id: 3, title: "Client check-in", who: "Cedar Street Barbers", due: "1 day late", tone: "overdue" },
];

export function TodayDemo() {
  const [done, setDone] = useState<number[]>([]);
  const left = DEMO.filter((t) => !done.includes(t.id));
  return (
    <div className="card w-full max-w-sm p-5 shadow-xl shadow-black/5">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-bold">Today</p>
        <span className="pill bg-surface-2 text-muted">{left.length} to do</span>
      </div>
      <ul className="mt-4 space-y-2">
        {left.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
            <button
              type="button"
              aria-label={`Mark ${t.title} for ${t.who} done`}
              onClick={() => setDone((d) => [...d, t.id])}
              className="h-5 w-5 shrink-0 rounded-full border-2 border-primary hover:bg-accent"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.title}</p>
              <p className="truncate text-xs text-muted">{t.who}</p>
            </div>
            <span className={`pill ${t.tone === "overdue" ? "bg-overdue/15 text-overdue" : "bg-today/15 text-today"}`}>{t.due}</span>
          </li>
        ))}
      </ul>
      {left.length === 0 && (
        <div className="py-8 text-center">
          <p className="font-display text-xl font-bold">All clear.</p>
          <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setDone([])}>Reset demo</button>
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Tap a circle to check it off.</p>
    </div>
  );
}
