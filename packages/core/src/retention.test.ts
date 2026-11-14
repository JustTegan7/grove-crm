import { describe, expect, it } from "vitest";
import { retentionDue } from "./retention";
import { agencyTemplate } from "./templates";
import type { StageDef } from "./types";

const stages: StageDef[] = agencyTemplate.stages.map((s, i) => ({
  id: `s-${s.key}`,
  key: s.key,
  label: s.label,
  position: i,
  color: s.color,
  group: s.group,
  cadenceBehavior: s.cadenceBehavior,
  checkinDays: s.checkinDays ?? null,
  resurfaceDays: s.resurfaceDays ?? null,
  clearsTasks: s.clearsTasks ?? false,
  isDefaultNew: s.isDefaultNew ?? false,
}));

const c = (id: string, stage: string, stageChangedOn: string, hasDetails = true) => ({ id, stageId: `s-${stage}`, stageChangedOn, hasDetails });

describe("retentionDue", () => {
  it("clears parked businesses after 28 days", () => {
    expect(retentionDue([c("a", "dnc", "2026-10-17")], stages, "2026-11-14")).toEqual(["a"]);
  });
  it("waits until day 28", () => {
    expect(retentionDue([c("a", "dnc", "2026-10-18")], stages, "2026-11-14")).toEqual([]);
  });
  it("covers the recycle bin as well as do not contact", () => {
    expect(retentionDue([c("a", "recycle", "2026-09-01")], stages, "2026-11-14")).toEqual(["a"]);
  });
  it("never touches active or won businesses", () => {
    const list = [c("a", "new_lead", "2026-01-01"), c("b", "client", "2026-01-01"), c("c", "contacted", "2026-01-01")];
    expect(retentionDue(list, stages, "2026-11-14")).toEqual([]);
  });
  it("skips businesses with nothing left to clear", () => {
    expect(retentionDue([c("a", "dnc", "2026-01-01", false)], stages, "2026-11-14")).toEqual([]);
  });
});
