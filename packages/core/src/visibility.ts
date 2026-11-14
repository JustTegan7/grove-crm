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

/** Every new workspace starts private: reps see their own businesses and tasks, and the owner can open it up on the Team page. */
export function defaultVisibility(_accountType: string): Visibility {
  return "own";
}
