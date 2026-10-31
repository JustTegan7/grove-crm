import "server-only";
import type { TaskView } from "../components/app/TaskRow";
import type { TaskRow } from "./services/tasks";
import type { Member } from "./services/workspace";

export function toTaskView(t: TaskRow, members: Member[]): TaskView {
  const m = members.find((x) => x.id === t.ownerId);
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
  };
}
