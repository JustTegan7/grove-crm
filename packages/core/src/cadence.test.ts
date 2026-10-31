import { describe, expect, it } from "vitest";
import { addDays, diffDays, todayIn } from "./dates";
import { DECIDE_TITLE, onComplete, onCreate, onReplied, onStageChange } from "./cadence";
import { agencyTemplate, type IndustryTemplate } from "./templates";
import type { CadenceStepDef, ContactState, OpenTask, StageDef } from "./types";

function build(t: IndustryTemplate) {
  const stages: StageDef[] = t.stages.map((s, i) => ({
    id: `stage-${s.key}`,
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
  const steps: CadenceStepDef[] = t.cadence.map((c, i) => ({ id: `step-${i}`, day: c.day, channel: c.channel, position: i }));
  const byKey = (k: string) => stages.find((s) => s.key === k)!;
  return { stages, steps, byKey };
}

const { stages, steps, byKey } = build(agencyTemplate);
const T0 = "2026-10-30";

function contact(patch: Partial<ContactState> = {}): ContactState {
  return {
    id: "c1",
    ownerId: "u1",
    stageId: byKey("new_lead").id,
    cadenceActive: true,
    cadenceDone: [],
    cadenceStartedOn: T0,
    checkinFrequencyDays: null,
    ...patch,
  };
}

describe("dates", () => {
  it("adds days across months and years", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(diffDays("2026-11-01", "2026-10-30")).toBe(2);
  });
  it("computes today in a time zone, not the server clock", () => {
    const late = new Date("2026-10-31T05:30:00Z"); // 10:30pm Oct 30 in Los Angeles
    expect(todayIn("America/Los_Angeles", late)).toBe("2026-10-30");
    expect(todayIn("UTC", late)).toBe("2026-10-31");
  });
});

describe("adding a lead", () => {
  it("creates the Day 1 email due today", () => {
    const fx = onCreate(contact({ cadenceActive: false, cadenceStartedOn: null }), byKey("new_lead"), steps, T0);
    expect(fx.createTasks).toHaveLength(1);
    expect(fx.createTasks[0]).toMatchObject({ kind: "followup", channel: "email", dueDate: T0, cadenceStepId: "step-0" });
    expect(fx.contactPatch).toMatchObject({ cadenceActive: true, cadenceStartedOn: T0, cadenceDone: [] });
  });
  it("adding straight into Client schedules a check-in, no cadence", () => {
    const fx = onCreate(contact({ cadenceActive: false, stageId: byKey("client").id }), byKey("client"), steps, T0);
    expect(fx.createTasks).toEqual([expect.objectContaining({ kind: "client", dueDate: addDays(T0, 30) })]);
  });
});

describe("completing follow-ups", () => {
  it("Day 1 done moves New Lead to Reached Out and schedules Day 3 call", () => {
    const task: OpenTask = { id: "t1", kind: "followup", cadenceStepId: "step-0", dueDate: T0 };
    const fx = onComplete({ task, contact: contact(), stages, steps, today: T0 });
    expect(fx.contactPatch.stageId).toBe(byKey("reached_out").id);
    expect(fx.createTasks[0]).toMatchObject({ channel: "call", dueDate: addDays(T0, 2), cadenceStepId: "step-1" });
  });
  it("overdue completion schedules the next step no earlier than today", () => {
    const today = addDays(T0, 7); // completed Day 3 a week late
    const task: OpenTask = { id: "t2", kind: "followup", cadenceStepId: "step-1", dueDate: addDays(T0, 2) };
    const fx = onComplete({ task, contact: contact({ stageId: byKey("reached_out").id, cadenceDone: ["step-0"] }), stages, steps, today });
    expect(fx.createTasks[0]).toMatchObject({ cadenceStepId: "step-2", dueDate: today });
    expect(fx.contactPatch.stageId).toBeUndefined();
  });
  it("after the last step creates a decide task that never resolves itself", () => {
    const today = addDays(T0, 13);
    const task: OpenTask = { id: "t5", kind: "followup", cadenceStepId: "step-4", dueDate: today };
    const fx = onComplete({
      task,
      contact: contact({ stageId: byKey("reached_out").id, cadenceDone: ["step-0", "step-1", "step-2", "step-3"] }),
      stages,
      steps,
      today,
    });
    expect(fx.createTasks).toEqual([expect.objectContaining({ kind: "decide", title: DECIDE_TITLE, dueDate: today })]);
    expect(fx.contactPatch.stageId).toBeUndefined();
  });
  it("completing a client check-in schedules the next one using the client's frequency", () => {
    const task: OpenTask = { id: "c", kind: "client", cadenceStepId: null, dueDate: T0 };
    const fx = onComplete({ task, contact: contact({ stageId: byKey("client").id, cadenceActive: false, checkinFrequencyDays: 60 }), stages, steps, today: T0 });
    expect(fx.createTasks[0]).toMatchObject({ kind: "client", dueDate: addDays(T0, 60) });
  });
});

describe("stage changes", () => {
  const open: OpenTask[] = [
    { id: "f", kind: "followup", cadenceStepId: "step-1", dueDate: T0 },
    { id: "m", kind: "manual", cadenceStepId: null, dueDate: T0 },
  ];
  it("they replied mid-cadence: move to Contacted, stop cadence, keep manual reminders", () => {
    const fx = onReplied({ contact: contact({ stageId: byKey("reached_out").id }), stages, openTasks: open, steps, today: T0 });
    expect(fx.contactPatch).toMatchObject({ stageId: byKey("contacted").id, cadenceActive: false });
    expect(fx.cancelTaskIds).toEqual(["f"]);
    expect(fx.activities[0].type).toBe("reply");
  });
  it("Client to Do Not Contact clears every pending task", () => {
    const clientOpen: OpenTask[] = [...open, { id: "ci", kind: "client", cadenceStepId: null, dueDate: T0 }];
    const fx = onStageChange({ contact: contact({ stageId: byKey("client").id, cadenceActive: false }), from: byKey("client"), to: byKey("dnc"), openTasks: clientOpen, steps, today: T0 });
    expect(new Set(fx.cancelTaskIds)).toEqual(new Set(["f", "m", "ci"]));
    expect(fx.createTasks).toHaveLength(0);
  });
  it("Recycle clears tasks and resurfaces in 90 days, then moving back restarts the cadence", () => {
    const fx = onStageChange({ contact: contact(), from: byKey("reached_out"), to: byKey("recycle"), openTasks: open, steps, today: T0 });
    expect(fx.createTasks).toEqual([expect.objectContaining({ kind: "resurface", dueDate: addDays(T0, 90) })]);
    expect(fx.contactPatch.cadenceActive).toBe(false);

    const later = addDays(T0, 90);
    const back = onStageChange({
      contact: contact({ stageId: byKey("recycle").id, cadenceActive: false, cadenceDone: ["step-0"] }),
      from: byKey("recycle"),
      to: byKey("new_lead"),
      openTasks: [{ id: "r", kind: "resurface", cadenceStepId: null, dueDate: later }],
      steps,
      today: later,
    });
    expect(back.cancelTaskIds).toContain("r");
    expect(back.contactPatch).toMatchObject({ cadenceActive: true, cadenceDone: [], cadenceStartedOn: later });
    expect(back.createTasks[0]).toMatchObject({ kind: "followup", dueDate: later });
  });
  it("moving to Client stops follow-ups and schedules a check-in", () => {
    const fx = onStageChange({ contact: contact(), from: byKey("new_lead"), to: byKey("client"), openTasks: open, steps, today: T0 });
    expect(fx.cancelTaskIds).toEqual(["f"]);
    expect(fx.createTasks[0]).toMatchObject({ kind: "client", dueDate: addDays(T0, 30) });
  });
});

describe("nothing is hardcoded", () => {
  const custom: IndustryTemplate = {
    key: "test",
    name: "Test",
    stages: [
      { key: "fresh", label: "Fresh", color: "#000", group: "active", cadenceBehavior: "start", isDefaultNew: true },
      { key: "working", label: "Working", color: "#000", group: "active", cadenceBehavior: "start" },
      { key: "talking", label: "Talking", color: "#000", group: "active", cadenceBehavior: "stop" },
      { key: "sold", label: "Sold", color: "#000", group: "won", cadenceBehavior: "stop", checkinDays: 7 },
      { key: "later", label: "Later", color: "#000", group: "parked", cadenceBehavior: "stop", resurfaceDays: 30, clearsTasks: true },
    ],
    cadence: [
      { day: 1, channel: "call" },
      { day: 2, channel: "text" },
    ],
  };
  const c = build(custom);
  it("uses the template's stages and days", () => {
    const base: ContactState = { ...contact(), stageId: c.byKey("fresh").id };
    const fx = onComplete({ task: { id: "x", kind: "followup", cadenceStepId: "step-0", dueDate: T0 }, contact: base, stages: c.stages, steps: c.steps, today: T0 });
    expect(fx.contactPatch.stageId).toBe(c.byKey("working").id);
    expect(fx.createTasks[0]).toMatchObject({ channel: "text", dueDate: addDays(T0, 1) });
    const replied = onReplied({ contact: base, stages: c.stages, openTasks: [], steps: c.steps, today: T0 });
    expect(replied.contactPatch.stageId).toBe(c.byKey("talking").id);
    const sold = onStageChange({ contact: base, from: c.byKey("fresh"), to: c.byKey("sold"), openTasks: [], steps: c.steps, today: T0 });
    expect(sold.createTasks[0]).toMatchObject({ kind: "client", dueDate: addDays(T0, 7) });
  });
});
