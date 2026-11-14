import { describe, expect, it } from "vitest";
import { canSeeAllRecords, defaultVisibility } from "./visibility";

describe("canSeeAllRecords", () => {
  it("owners and managers always see everything", () => {
    for (const v of ["team", "own"] as const) {
      expect(canSeeAllRecords("owner", v)).toBe(true);
      expect(canSeeAllRecords("manager", v)).toBe(true);
    }
  });
  it("salespeople see everything only when the workspace is shared", () => {
    expect(canSeeAllRecords("salesperson", "team")).toBe(true);
    expect(canSeeAllRecords("salesperson", "own")).toBe(false);
  });
});

describe("defaultVisibility", () => {
  it("new workspaces start private whatever the type", () => {
    for (const t of ["dealership", "small_business", "door_to_door", "big_business"]) expect(defaultVisibility(t)).toBe("own");
  });
});
