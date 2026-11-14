import "server-only";
import type { TaskView } from "../components/app/TaskRow";
import type { TaskRow } from "./services/tasks";
import type { Member } from "./services/workspace";
import { fillTemplate, pickTemplate, type MessageTemplateView } from "./services/messages";

export interface MessageSource {
  templates: MessageTemplateView[];
  company: string;
  sender: string;
}

export function toTaskView(t: TaskRow, members: Member[], source?: MessageSource): TaskView {
  const m = members.find((x) => x.id === t.ownerId);
  const tpl = source && t.channel && t.contactId && t.kind !== "decide" && !t.doneAt ? pickTemplate(source.templates, t.channel, t.stepDay) : null;
  return {
    id: t.id,
    kind: t.kind,
    channel: t.channel,
    title: t.title,
    note: t.note,
    dueDate: t.dueDate,
    done: Boolean(t.doneAt),
    contactId: t.contactId,
    contactName: t.contactName,
    contactPhone: t.contactPhone,
    owner: m ? { name: m.name, color: m.color } : undefined,
    message: tpl && source ? fillTemplate(tpl, { business: t.contactName ?? "", contactName: t.contactPerson, owner: source.sender, company: source.company }) : undefined,
  };
}
