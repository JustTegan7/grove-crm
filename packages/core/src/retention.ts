import { diffDays, type Ymd } from "./dates";
import type { StageDef } from "./types";

/** Days a business stays parked (Recycle Bin or Do Not Contact) before its person details clear. */
export const RETENTION_DAYS = 28;

export interface RetentionContact {
  id: string;
  stageId: string;
  /** The day the business entered its current stage, in the workspace time zone. */
  stageChangedOn: Ymd;
  /** True when any person detail (contact name, role, phone, email, social) is still filled in. */
  hasDetails: boolean;
}

/**
 * Which businesses have person details to clear today: parked for 28 days or more.
 * Found by stage group, never by stage name. The business name, stage, notes and
 * history stay, so a Do Not Contact business is still recognised if it is added again.
 */
export function retentionDue(contacts: RetentionContact[], stages: StageDef[], today: Ymd): string[] {
  const parked = new Set(stages.filter((s) => s.group === "parked").map((s) => s.id));
  return contacts
    .filter((c) => c.hasDetails && parked.has(c.stageId) && diffDays(today, c.stageChangedOn) >= RETENTION_DAYS)
    .map((c) => c.id);
}
