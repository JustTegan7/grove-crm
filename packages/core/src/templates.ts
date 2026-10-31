import type { CadenceBehavior, Channel, StageGroup } from "./types";

export interface StageTemplate {
  key: string;
  label: string;
  color: string;
  group: StageGroup;
  cadenceBehavior: CadenceBehavior;
  checkinDays?: number;
  resurfaceDays?: number;
  clearsTasks?: boolean;
  isDefaultNew?: boolean;
}

export interface IndustryTemplate {
  key: string;
  name: string;
  stages: StageTemplate[];
  cadence: { day: number; channel: Channel }[];
}

/** Evergreen Digital and other small agencies. */
export const agencyTemplate: IndustryTemplate = {
  key: "agency",
  name: "Agency",
  stages: [
    { key: "new_lead", label: "New Lead", color: "#4FB39C", group: "active", cadenceBehavior: "start", isDefaultNew: true },
    { key: "reached_out", label: "Reached Out", color: "#7FC28A", group: "active", cadenceBehavior: "start" },
    { key: "contacted", label: "Contacted", color: "#B8E066", group: "active", cadenceBehavior: "stop" },
    { key: "proposal_sent", label: "Proposal Sent", color: "#E8B33A", group: "active", cadenceBehavior: "stop" },
    { key: "client", label: "Client", color: "#0F3D3A", group: "won", cadenceBehavior: "stop", checkinDays: 30 },
    { key: "recycle", label: "Recycle Bin", color: "#8A9A94", group: "parked", cadenceBehavior: "stop", resurfaceDays: 90, clearsTasks: true },
    { key: "dnc", label: "Do Not Contact", color: "#C8643C", group: "parked", cadenceBehavior: "stop", clearsTasks: true },
  ],
  cadence: [
    { day: 1, channel: "email" },
    { day: 3, channel: "call" },
    { day: 5, channel: "text" },
    { day: 10, channel: "email" },
    { day: 14, channel: "call" },
  ],
};

// Placeholder: the dealership template gets defined with the pilot.
export const templates: Record<string, IndustryTemplate> = { agency: agencyTemplate };
