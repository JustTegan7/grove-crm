"use client";

import Link from "next/link";
import { useState } from "react";
import { dueLabel, dueState } from "@grove/core";
import { completeTaskAction, decideAction, deleteTaskAction, snoozeTaskAction, updateTaskAction } from "../../app/(app)/actions";
import { ChannelIcon } from "./Icons";
import { useAct } from "./useAct";

export type TaskView = {
  id: string;
  kind: "followup" | "decide" | "manual" | "client" | "resurface";
  channel: "email" | "call" | "text" | null;
  title: string;
  note: string | null;
  dueDate: string;
  done: boolean;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  owner?: { name: string; color: string };
};

export function DuePill({ due, today }: { due: string; today: string }) {
  const s = dueState(due, today);
  const cls = s === "overdue" ? "bg-overdue/15 text-overdue" : s === "today" ? "bg-today/15 text-today" : "bg-surface-2 text-muted";
  return <span className={`pill ${cls}`}>{dueLabel(due, today)}</span>;
}

export function TaskRow({ task, today, showBusiness = true }: { task: TaskView; today: string; showBusiness?: boolean }) {
  const { act, pending } = useAct();
  // The row slides out while completing. Keyed to the task's state so an Undo
  // (which brings the same task back open) shows it again.
  const sig = `${task.done}:${task.dueDate}`;
  const [leavingSig, setLeavingSig] = useState<string | null>(null);
  const leaving = leavingSig === sig;
  const [editing, setEditing] = useState(false);
  const s = dueState(task.dueDate, today);

  return (
    <li className={`flex items-start gap-3 rounded-xl border border-line bg-surface p-3 transition-all duration-300 ${leaving ? "translate-x-4 opacity-0" : ""}`}>
      {task.done ? (
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-fg" aria-label="Done">✓</span>
      ) : task.kind === "decide" ? (
        <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-muted" aria-hidden />
      ) : (
        <button
          type="button"
          disabled={pending}
          aria-label={`Complete ${task.title}`}
          onClick={() => { setLeavingSig(sig); act(() => completeTaskAction(task.id), undefined, () => setLeavingSig(null)); }}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-primary hover:bg-accent"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <ChannelIcon channel={task.channel} />
          <p className={`text-sm font-semibold ${task.done ? "text-muted line-through" : ""}`}>{task.title}</p>
          {!task.done && <DuePill due={task.dueDate} today={today} />}
        </div>
        {showBusiness && task.contactId && (
          <Link href={`/businesses/${task.contactId}`} className="text-sm text-muted hover:text-fg hover:underline">{task.contactName}</Link>
        )}
        {task.note && <p className="mt-1 text-xs text-muted">{task.note}</p>}
        {editing && !task.done && (
          <form
            className="mt-3 space-y-2 rounded-lg bg-surface-2 p-3"
            action={(f) => act(() => updateTaskAction(f), () => setEditing(false))}
          >
            <input type="hidden" name="id" value={task.id} />
            {task.kind === "manual" && (
              <div>
                <label className="label" htmlFor={`tt-${task.id}`}>What</label>
                <input id={`tt-${task.id}`} name="title" className="input" defaultValue={task.title} required maxLength={200} />
              </div>
            )}
            <div>
              <label className="label" htmlFor={`td-${task.id}`}>Day</label>
              <input id={`td-${task.id}`} name="dueDate" type="date" className="input" min={today} defaultValue={task.dueDate < today ? today : task.dueDate} required />
            </div>
            <div>
              <label className="label" htmlFor={`tn-${task.id}`}>Note</label>
              <textarea id={`tn-${task.id}`} name="note" className="input" rows={2} defaultValue={task.note ?? ""} maxLength={1000} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary btn-sm" disabled={pending}>Save</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              {task.kind === "manual" && (
                <button type="button" className="btn btn-danger btn-sm ml-auto" disabled={pending} onClick={() => act(() => deleteTaskAction(task.id))}>Delete reminder</button>
              )}
            </div>
          </form>
        )}
        {task.kind === "decide" && !task.done && (
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn btn-soft btn-sm" disabled={pending} onClick={() => act(() => decideAction(task.id, "recycle"))}>Recycle</button>
            <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => act(() => decideAction(task.id, "dnc"))}>Do not contact</button>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {task.owner && (
          <span title={task.owner.name} className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: task.owner.color }}>
            {task.owner.name.slice(0, 1)}
          </span>
        )}
        {!task.done && task.channel === "call" && task.contactPhone && (
          <a href={`tel:${task.contactPhone}`} className="btn btn-ghost btn-sm">Call</a>
        )}
        {!task.done && task.kind !== "decide" && (
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={editing} aria-label={`Edit ${task.title}`} onClick={() => setEditing((v) => !v)}>Edit</button>
        )}
        {!task.done && task.kind !== "decide" && (s === "overdue" || s === "today") && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => act(() => snoozeTaskAction(task.id))}>Tomorrow</button>
        )}
      </div>
    </li>
  );
}
