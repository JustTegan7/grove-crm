import type { CadenceStepDef, Channel, Role, StageDef } from "./shared";

export interface Member { id: string; name: string; email: string; role: Role; color: string }
export interface MessageTemplate { id: string; name: string; channel: Channel; day: number | null; subject: string | null; body: string }

export interface Me {
  user: { id: string; name: string; email: string; role: Role };
  workspace: { id: string; name: string; timezone: string };
  today: string;
  dueCount: number;
  stages: StageDef[];
  steps: CadenceStepDef[];
  members: Member[];
  templates: MessageTemplate[];
}

export interface TaskView {
  id: string;
  kind: "followup" | "decide" | "manual" | "client" | "resurface";
  channel: Channel | null;
  title: string;
  note: string | null;
  dueDate: string;
  done: boolean;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  owner?: { name: string; color: string };
  message?: { subject: string | null; body: string };
}

export interface BusinessRow {
  id: string;
  name: string;
  niche: string | null;
  contactName: string | null;
  phone: string | null;
  stageId: string;
  ownerId: string;
  tier: string | null;
  nextDue: string | null;
}

export interface BusinessDetail {
  contact: {
    id: string; name: string; niche: string | null; source: string | null; stageId: string; ownerId: string;
    contactName: string | null; contactRole: string | null; phone: string | null; email: string | null;
    website: string | null; social: string | null; notes: string | null; tier: string | null;
  };
  openTasks: { id: string; title: string; dueDate: string; kind: string; channel: Channel | null }[];
  history: { id: string; type: string; body: string; createdAt: string }[];
}
