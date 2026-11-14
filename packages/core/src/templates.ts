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

const standardCadence: IndustryTemplate["cadence"] = [
  { day: 1, channel: "email" },
  { day: 3, channel: "call" },
  { day: 5, channel: "text" },
  { day: 10, channel: "email" },
  { day: 14, channel: "call" },
];

/** Small local businesses selling to other businesses or households. */
export const smallBusinessTemplate: IndustryTemplate = {
  key: "small_business",
  name: "Small business",
  stages: [
    { key: "new_lead", label: "New Lead", color: "#4FB39C", group: "active", cadenceBehavior: "start", isDefaultNew: true },
    { key: "reached_out", label: "Reached Out", color: "#7FC28A", group: "active", cadenceBehavior: "start" },
    { key: "contacted", label: "Contacted", color: "#B8E066", group: "active", cadenceBehavior: "stop" },
    { key: "quote_sent", label: "Quote Sent", color: "#E8B33A", group: "active", cadenceBehavior: "stop" },
    { key: "customer", label: "Customer", color: "#0F3D3A", group: "won", cadenceBehavior: "stop", checkinDays: 30 },
    { key: "recycle", label: "Recycle Bin", color: "#8A9A94", group: "parked", cadenceBehavior: "stop", resurfaceDays: 90, clearsTasks: true },
    { key: "dnc", label: "Do Not Contact", color: "#C8643C", group: "parked", cadenceBehavior: "stop", clearsTasks: true },
  ],
  cadence: standardCadence,
};

/** Car dealerships. Appointment and showroom stages, customers check in on a longer rhythm. */
export const dealershipTemplate: IndustryTemplate = {
  key: "dealership",
  name: "Dealership",
  stages: [
    { key: "new_lead", label: "New Lead", color: "#4FB39C", group: "active", cadenceBehavior: "start", isDefaultNew: true },
    { key: "attempting_contact", label: "Attempting Contact", color: "#7FC28A", group: "active", cadenceBehavior: "start" },
    { key: "contacted", label: "Contacted", color: "#B8E066", group: "active", cadenceBehavior: "stop" },
    { key: "appointment_set", label: "Appointment Set", color: "#E8B33A", group: "active", cadenceBehavior: "stop" },
    { key: "showed", label: "Showed", color: "#D98F2B", group: "active", cadenceBehavior: "stop" },
    { key: "sold", label: "Sold", color: "#0F3D3A", group: "won", cadenceBehavior: "stop", checkinDays: 60 },
    { key: "recycle", label: "Recycle Bin", color: "#8A9A94", group: "parked", cadenceBehavior: "stop", resurfaceDays: 90, clearsTasks: true },
    { key: "dnc", label: "Do Not Contact", color: "#C8643C", group: "parked", cadenceBehavior: "stop", clearsTasks: true },
  ],
  cadence: standardCadence,
};

/** Door to door: quick visits logged from the street. */
export const doorToDoorTemplate: IndustryTemplate = {
  key: "door_to_door",
  name: "Door to door",
  stages: [
    { key: "knocked", label: "Knocked", color: "#4FB39C", group: "active", cadenceBehavior: "start", isDefaultNew: true },
    { key: "left_info", label: "Left Info", color: "#7FC28A", group: "active", cadenceBehavior: "start" },
    { key: "talked", label: "Talked", color: "#B8E066", group: "active", cadenceBehavior: "stop" },
    { key: "estimate_given", label: "Estimate Given", color: "#E8B33A", group: "active", cadenceBehavior: "stop" },
    { key: "customer", label: "Customer", color: "#0F3D3A", group: "won", cadenceBehavior: "stop", checkinDays: 30 },
    { key: "recycle", label: "Come Back Later", color: "#8A9A94", group: "parked", cadenceBehavior: "stop", resurfaceDays: 90, clearsTasks: true },
    { key: "dnc", label: "Do Not Contact", color: "#C8643C", group: "parked", cadenceBehavior: "stop", clearsTasks: true },
  ],
  cadence: standardCadence,
};

export const templates: Record<string, IndustryTemplate> = {
  agency: agencyTemplate,
  small_business: smallBusinessTemplate,
  dealership: dealershipTemplate,
  door_to_door: doorToDoorTemplate,
};

export const ACCOUNT_TYPES = ["door_to_door", "small_business", "big_business", "dealership"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Which starting template a new workspace gets for each account type. Big business starts from the small business stages. */
export const templateForAccountType: Record<AccountType, string> = {
  door_to_door: "door_to_door",
  small_business: "small_business",
  big_business: "small_business",
  dealership: "dealership",
};
