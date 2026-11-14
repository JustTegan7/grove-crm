"use client";

import { useState } from "react";
import { MERGE_FIELDS } from "@grove/core";
import { deleteMessageTemplateAction, saveMessageTemplateAction } from "../../app/(app)/actions";
import type { MessageTemplateView } from "../../lib/services/messages";
import { useAct } from "./useAct";

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call script" },
  { value: "text", label: "Text" },
] as const;

export function TemplateEditor({ template }: { template?: MessageTemplateView }) {
  const { act, pending } = useAct();
  const [open, setOpen] = useState(!template);
  const [channel, setChannel] = useState<string>(template?.channel ?? "email");
  const key = template?.id ?? "new";

  if (!open && template) {
    return (
      <li className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{template.name}</p>
          <span className="pill bg-surface-2 text-muted capitalize">{template.channel}</span>
          <span className="pill bg-surface-2 text-muted">{template.day ? `Day ${template.day}` : "Any day"}</span>
          <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => setOpen(true)}>Edit</button>
        </div>
        {template.subject && <p className="mt-2 text-sm font-semibold">{template.subject}</p>}
        <p className="mt-1 whitespace-pre-line text-sm text-muted">{template.body}</p>
      </li>
    );
  }

  return (
    <li className="card p-4">
      <form
        className="space-y-3"
        action={(f) =>
          act(
            () => saveMessageTemplateAction(f),
            () => { if (template) setOpen(false); },
          )
        }
      >
        {template && <input type="hidden" name="id" value={template.id} />}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor={`name-${key}`}>Name</label>
            <input id={`name-${key}`} name="name" className="input" required maxLength={80} defaultValue={template?.name} placeholder="Day 1 email" />
          </div>
          <div>
            <label className="label" htmlFor={`day-${key}`}>Cadence day (optional)</label>
            <input id={`day-${key}`} name="day" type="number" min={1} max={365} className="input" defaultValue={template?.day ?? ""} placeholder="Any day" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor={`ch-${key}`}>Type</label>
          <select id={`ch-${key}`} name="channel" className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        {channel === "email" && (
          <div>
            <label className="label" htmlFor={`sub-${key}`}>Subject</label>
            <input id={`sub-${key}`} name="subject" className="input" maxLength={200} defaultValue={template?.subject ?? ""} />
          </div>
        )}
        <div>
          <label className="label" htmlFor={`body-${key}`}>Message</label>
          <textarea id={`body-${key}`} name="body" className="input min-h-32" required maxLength={5000} defaultValue={template?.body} />
          <p className="mt-1 text-xs text-muted">Fields: {MERGE_FIELDS.map((f) => `{{${f}}}`).join("  ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary btn-sm" disabled={pending}>{template ? "Save" : "Add template"}</button>
          {template && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>}
          {template && (
            <button
              type="button"
              className="btn btn-ghost btn-sm ml-auto text-overdue"
              disabled={pending}
              onClick={() => { if (confirm(`Delete "${template.name}"?`)) act(() => deleteMessageTemplateAction(template.id)); }}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </li>
  );
}
