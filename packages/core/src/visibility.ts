import type { Role } from "./types";

/**
 * "team": everyone in the workspace sees every business and task.
 * "own": salespeople see only what they own. Owners and managers always see everything.
 */
export const VISIBILITY = ["team", "own"] as const;
export type Visibility = (typeof VISIBILITY)[number];

export function canSeeAllRecords(role: Role, visibility: Visibility): boolean {
  return role !== "salesperson" || visibility === "team";
}

/** A new workspace starts private for dealerships, where reps compete for the same customers, and shared otherwise. */
export function defaultVisibility(accountType: string): Visibility {
  return accountType === "dealership" ? "own" : "team";
}
