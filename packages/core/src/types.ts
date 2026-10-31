import type { Ymd } from "./dates";

export type Channel = "email" | "call" | "text";
export type StageGroup = "active" | "won" | "parked";
export type CadenceBehavior = "start" | "stop" | "none";
export type TaskKind = "followup" | "decide" | "manual" | "client" | "resurface";
export type Role = "owner" | "manager" | "salesperson";
export const TIERS = ["Ultra-Lite", "Basic", "Growth", "Elite"] as const;
export type Tier = (typeof TIERS)[number];

export interface StageDef {
  id: string;
  key: string;
  label: string;
  position: number;
  color: string;
  group: StageGroup;
  cadenceBehavior: CadenceBehavior;
  checkinDays: number | null;
  resurfaceDays: number | null;
  clearsTasks: boolean;
  isDefaultNew: boolean;
}

export interface CadenceStepDef {
  id: string;
  /** Day number in the cadence. Day 1 is the day the lead was added. */
  day: number;
  channel: Channel;
  position: number;
}

export interface ContactState {
  id: string;
  ownerId: string;
  stageId: string;
  cadenceActive: boolean;
  /** Step ids already completed in the current cadence run. */
  cadenceDone: string[];
  /** Day 1 of the current cadence run. */
  cadenceStartedOn: Ymd | null;
  /** Days between client check-ins, overrides the stage default. */
  checkinFrequencyDays: number | null;
}

export interface OpenTask {
  id: string;
  kind: TaskKind;
  cadenceStepId: string | null;
  dueDate: Ymd;
}

export interface NewTask {
  kind: TaskKind;
  channel: Channel | null;
  title: string;
  dueDate: Ymd;
  cadenceStepId: string | null;
  ownerId: string;
}

export interface Effects {
  createTasks: NewTask[];
  cancelTaskIds: string[];
  contactPatch: Partial<Omit<ContactState, "id" | "ownerId">>;
  activities: { type: "stage" | "system" | "reply"; body: string }[];
  /** Plain-language note for the UI toast. */
  message: string;
}
