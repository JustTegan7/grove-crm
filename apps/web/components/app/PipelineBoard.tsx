"use client";

import Link from "next/link";
import { useOptimistic, useState, startTransition } from "react";
import { moveStageAction } from "../../app/(app)/actions";
import { DuePill } from "./TaskRow";
import { useResultToast } from "./useAct";

export type BoardStage = { id: string; label: string; color: string; group: "active" | "won" | "parked" };
export type BoardCard = { id: string; name: string; niche: string | null; stageId: string; owner?: { name: string; color: string }; nextDue: string | null };

function Card({ card, stages, today, onMove }: { card: BoardCard; stages: BoardStage[]; today: string; onMove: (id: string, stageId: string) => void }) {
  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
      className="relative cursor-grab rounded-xl border border-line bg-surface p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <Link href={`/businesses/${card.id}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold hover:underline">{card.name}</p>
          {card.niche && <p className="truncate text-xs text-muted">{card.niche}</p>}
        </Link>
        {card.owner && (
          <span title={card.owner.name} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: card.owner.color }}>
            {card.owner.name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {card.nextDue ? <DuePill due={card.nextDue} today={today} /> : <span className="text-xs text-muted">No tasks</span>}
        <label className="sr-only" htmlFor={`mv-${card.id}`}>Move {card.name}</label>
        <select id={`mv-${card.id}`} value={card.stageId} onChange={(e) => onMove(card.id, e.target.value)} className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-xs">
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
    </li>
  );
}

export function PipelineBoard({ stages, cards, today }: { stages: BoardStage[]; cards: BoardCard[]; today: string }) {
  const show = useResultToast();
  const [optimistic, setOptimistic] = useOptimistic(cards, (state, m: { id: string; stageId: string }) =>
    state.map((c) => (c.id === m.id ? { ...c, stageId: m.stageId } : c)),
  );
  const [over, setOver] = useState<string | null>(null);
  const [showParked, setShowParked] = useState(false);

  function move(id: string, stageId: string) {
    const card = optimistic.find((c) => c.id === id);
    if (!card || card.stageId === stageId) return;
    startTransition(async () => {
      setOptimistic({ id, stageId });
      const r = await moveStageAction(id, stageId);
      show(r);
    });
  }

  const dropProps = (stageId: string) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(stageId); },
    onDragLeave: () => setOver((o) => (o === stageId ? null : o)),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setOver(null); move(e.dataTransfer.getData("text/plain"), stageId); },
  });

  const columns = stages.filter((s) => s.group !== "parked");
  const parked = stages.filter((s) => s.group === "parked");
  const parkedCount = optimistic.filter((c) => parked.some((p) => p.id === c.stageId)).length;

  return (
    <div>
      <div className="relative -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {columns.map((s) => {
          const list = optimistic.filter((c) => c.stageId === s.id);
          return (
            <section key={s.id} {...dropProps(s.id)} aria-label={s.label} className={`w-72 shrink-0 snap-start rounded-2xl bg-surface-2 p-3 transition-colors ${over === s.id ? "ring-2 ring-primary" : ""}`}>
              <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.label}
                <span className="ml-auto text-muted">{list.length}</span>
              </h2>
              <ul className="min-h-16 space-y-2">
                {list.map((c) => <Card key={c.id} card={c} stages={stages} today={today} onMove={move} />)}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="mt-4 rounded-2xl border border-dashed border-line p-3">
        <button type="button" onClick={() => setShowParked((v) => !v)} className="flex w-full items-center gap-2 text-sm font-bold" aria-expanded={showParked}>
          Parked <span className="text-muted">{parkedCount}</span>
          <span className="ml-auto text-xs font-normal text-muted">{showParked ? "Hide" : "Show"}</span>
        </button>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {parked.map((s) => {
            const list = optimistic.filter((c) => c.stageId === s.id);
            return (
              <div key={s.id} {...dropProps(s.id)} className={`rounded-xl bg-surface-2 p-3 ${over === s.id ? "ring-2 ring-primary" : ""}`}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label} <span className="ml-auto text-muted">{list.length}</span>
                </h3>
                {showParked ? (
                  <ul className="space-y-2">{list.map((c) => <Card key={c.id} card={c} stages={stages} today={today} onMove={move} />)}</ul>
                ) : (
                  <p className="text-xs text-muted">Drop a card here.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
