import { describe, expect, it } from "vitest";
import { DECIDE_TITLE } from "./cadence";
import {
  guessField,
  guessMapping,
  guessStage,
  importStartEffects,
  isSensitiveHeader,
  normalizePhone,
  parseDay,
  parseTier,
  planImport,
  distinctStageValues,
  chunk,
  type ImportOptions,
} from "./importer";
import { agencyTemplate, type IndustryTemplate } from "./templates";
import type { CadenceStepDef, ContactState, StageDef } from "./types";

const uuid = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, "0")}`;

function build(t: IndustryTemplate) {
  const stages: StageDef[] = t.stages.map((s, i) => ({
    id: uuid(i + 1),
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
  const steps: CadenceStepDef[] = t.cadence.map((c, i) => ({ id: uuid(100 + i), day: c.day, channel: c.channel, position: i }));
  const byKey = (k: string) => stages.find((s) => s.key === k)!;
  return { stages, steps, byKey };
}

const { stages, steps, byKey } = build(agencyTemplate);
const TODAY = "2026-11-01";

// A made-up template with different names and days, to prove nothing is hardcoded.
const other = build({
  key: "made-up",
  name: "Made up",
  stages: [
    { key: "fresh", label: "Fresh", color: "#000", group: "active", cadenceBehavior: "start", isDefaultNew: true },
    { key: "talking", label: "Talking", color: "#000", group: "active", cadenceBehavior: "stop" },
    { key: "won", label: "Signed", color: "#000", group: "won", cadenceBehavior: "stop", checkinDays: 45 },
    { key: "later", label: "Later", color: "#000", group: "parked", cadenceBehavior: "stop", resurfaceDays: 30, clearsTasks: true },
  ],
  cadence: [
    { day: 2, channel: "call" },
    { day: 7, channel: "email" },
  ],
} as IndustryTemplate);

function contact(stageId: string): ContactState {
  return { id: "c1", ownerId: "u1", stageId, cadenceActive: false, cadenceDone: [], cadenceStartedOn: null, checkinFrequencyDays: null };
}

describe("headers", () => {
  it("guesses the obvious columns", () => {
    expect(guessMapping(["Business Name", "Niche", "Contact", "Phone", "Email", "Website", "Instagram", "Status", "Date Added", "Tier", "Live site URL", "Launch date", "Notes", "Random"])).toEqual([
      "name", "niche", "contactName", "phone", "email", "website", "social", "stage", "createdDate", "tier", "siteUrl", "launchDate", "notes", "skip",
    ]);
  });
  it("uses each field once", () => {
    expect(guessMapping(["Phone", "Cell"])).toEqual(["phone", "skip"]);
  });
  it("skips anything that looks like financing, credit, SSN or loan data", () => {
    for (const h of ["Credit score", "SSN", "Social Security #", "Loan amount", "Financing", "Bank account", "APR"]) {
      expect(isSensitiveHeader(h), h).toBe(true);
      expect(guessField(h), h).toBe("skip");
    }
    expect(isSensitiveHeader("Socials")).toBe(false);
    expect(guessField("Socials")).toBe("social");
  });
});

describe("values", () => {
  it("normalizes phones to digits", () => {
    expect(normalizePhone("(425) 555-0101")).toBe("4255550101");
    expect(normalizePhone("+1 425.555.0101")).toBe("4255550101");
  });
  it("parses common sheet dates to a day", () => {
    expect(parseDay("2026-10-05")).toBe("2026-10-05");
    expect(parseDay("10/5/2026")).toBe("2026-10-05");
    expect(parseDay("10/5/26")).toBe("2026-10-05");
    expect(parseDay("Oct 5, 2026")).toBe("2026-10-05");
    expect(parseDay("5 October 2026")).toBe("2026-10-05");
    expect(parseDay("10/5/2026 3:15 PM")).toBe("2026-10-05");
    expect(parseDay("2/30/2026")).toBeNull();
    expect(parseDay("soon")).toBeNull();
    expect(parseDay("")).toBeNull();
  });
  it("matches tiers loosely", () => {
    expect(parseTier("ultra lite")).toBe("Ultra-Lite");
    expect(parseTier("GROWTH")).toBe("Growth");
    expect(parseTier("Platinum")).toBeNull();
  });
  it("finds distinct stage values and auto-matches them", () => {
    const rows = [{ S: "Client" }, { S: "client" }, { S: "Recycle bin" }, { S: "" }, { S: "Hot" }];
    expect(distinctStageValues(rows, "S")).toEqual(["Client", "Recycle bin", "Hot"]);
    expect(guessStage("client", stages)).toBe(byKey("client").id);
    expect(guessStage("Recycle Bin", stages)).toBe(byKey("recycle").id);
    expect(guessStage("Hot", stages)).toBe("");
  });
  it("chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("planImport", () => {
  const headers = ["Business", "Phone", "Email", "Status", "Added", "Launch", "Tier", "Credit score"];
  const options: ImportOptions = {
    mapping: ["name", "phone", "email", "stage", "createdDate", "launchDate", "tier", "name"],
    defaultOwnerId: "u1",
    defaultStageId: byKey("new_lead").id,
    stageMap: { client: byKey("client").id, hot: "" },
  };
  const row = (b: string, p = "", extra: Partial<Record<string, string>> = {}) => ({ Business: b, Phone: p, Email: "", Status: "", Added: "", Launch: "", Tier: "", "Credit score": "720", ...extra });

  it("creates, dedupes against existing and the file, and reports errors", () => {
    const plan = planImport({
      headers,
      options,
      stages,
      today: TODAY,
      existing: [{ name: "Tata's Mexican", phone: "425-555-0000" }],
      rows: [
        row("Barclay's Salon", "(425) 555-0101"),
        row("  barclay's   salon ", ""), // same name as row above
        row("Other Shop", "+1 425 555 0101"), // same phone as row above
        row("TATA'S MEXICAN"), // existing name
        row("New Phone Shop", "4255550000"), // existing phone
        row("", "123"), // no name
        row("Bad Email Co", "", { Email: "nope" }),
        row("Bad Launch", "", { Launch: "someday" }),
        row("Client Co", "", { Status: "Client", Added: "9/1/2026", Launch: "2026-09-15", Tier: "growth" }),
        row("Hot Lead", "", { Status: "Hot" }),
        { Business: "", Phone: "", Email: "", Status: "", Added: "", Launch: "", Tier: "", "Credit score": "" },
      ],
    });
    expect(plan.create.map((r) => r.name)).toEqual(["Barclay's Salon", "Client Co", "Hot Lead"]);
    expect(plan.duplicates.map((d) => [d.line, d.reason])).toEqual([
      [3, "Same business name"],
      [4, "Same phone"],
      [5, "Same business name"],
      [6, "Same phone"],
    ]);
    expect(plan.errors.map((e) => e.line)).toEqual([7, 8, 9]);
    const client = plan.create[1];
    expect(client).toMatchObject({ stageId: byKey("client").id, createdOn: "2026-09-01", launchDate: "2026-09-15", tier: "Growth", line: 10 });
    expect(plan.create[2].stageId).toBe(byKey("new_lead").id);
    expect(plan.create[0].createdOn).toBe(TODAY);
  });

  it("never reads a sensitive column even if mapped", () => {
    const plan = planImport({
      headers: ["Credit score"],
      options: { ...options, mapping: ["name"] },
      stages,
      today: TODAY,
      existing: [],
      rows: [{ "Credit score": "720" }],
    });
    expect(plan.create).toHaveLength(0);
    expect(plan.errors[0].error).toMatch(/Business name/);
  });

  it("clamps future created dates to today", () => {
    const plan = planImport({ headers, options, stages, today: TODAY, existing: [], rows: [row("Future", "", { Added: "12/25/2026" })] });
    expect(plan.create[0].createdOn).toBe(TODAY);
  });
});

describe("importStartEffects", () => {
  it("starts the cadence from the created date, never due before today", () => {
    const fx = importStartEffects({ contact: contact(byKey("new_lead").id), stage: byKey("new_lead"), steps, createdOn: "2026-10-25", today: TODAY });
    expect(fx.contactPatch).toMatchObject({ cadenceActive: true, cadenceStartedOn: "2026-10-25" });
    expect(fx.createTasks).toHaveLength(1);
    expect(fx.createTasks[0]).toMatchObject({ kind: "followup", dueDate: TODAY, cadenceStepId: steps[0].id });
  });

  it("keeps future-relative due dates when created today", () => {
    const fx = importStartEffects({ contact: contact(other.byKey("fresh").id), stage: other.byKey("fresh"), steps: other.steps, createdOn: TODAY, today: TODAY });
    expect(fx.createTasks[0]).toMatchObject({ channel: "call", dueDate: "2026-11-02" });
  });

  it("gives a lead 14 or more days old one decide task instead of overdue follow-ups", () => {
    for (const t of [{ ...build(agencyTemplate), key: "new_lead" }, { ...other, key: "fresh" }]) {
      const fx = importStartEffects({ contact: contact(t.byKey(t.key).id), stage: t.byKey(t.key), steps: t.steps, createdOn: "2026-10-18", today: TODAY });
      expect(fx.createTasks).toHaveLength(1);
      expect(fx.createTasks[0]).toMatchObject({ kind: "decide", title: DECIDE_TITLE, dueDate: TODAY });
      expect(fx.contactPatch.cadenceActive).toBe(false);
    }
    const fresh = importStartEffects({ contact: contact(byKey("new_lead").id), stage: byKey("new_lead"), steps, createdOn: "2026-10-19", today: TODAY });
    expect(fresh.createTasks[0].kind).toBe("followup");
  });

  it("applies the same stale rule to any stage that starts a cadence", () => {
    const fx = importStartEffects({ contact: contact(byKey("reached_out").id), stage: byKey("reached_out"), steps, createdOn: "2026-08-01", today: TODAY });
    expect(fx.createTasks.map((t) => t.kind)).toEqual(["decide"]);
  });

  it("other stages use the engine's entry behavior from today", () => {
    const client = importStartEffects({ contact: contact(byKey("client").id), stage: byKey("client"), steps, createdOn: "2026-01-01", today: TODAY });
    expect(client.createTasks).toEqual([expect.objectContaining({ kind: "client", dueDate: "2026-12-01" })]);

    const recycle = importStartEffects({ contact: contact(byKey("recycle").id), stage: byKey("recycle"), steps, createdOn: "2026-01-01", today: TODAY });
    expect(recycle.createTasks).toEqual([expect.objectContaining({ kind: "resurface", dueDate: "2027-01-30" })]);

    const dnc = importStartEffects({ contact: contact(byKey("dnc").id), stage: byKey("dnc"), steps, createdOn: "2026-01-01", today: TODAY });
    expect(dnc.createTasks).toEqual([]);

    const contacted = importStartEffects({ contact: contact(byKey("contacted").id), stage: byKey("contacted"), steps, createdOn: "2026-01-01", today: TODAY });
    expect(contacted.createTasks).toEqual([]);

    const signed = importStartEffects({ contact: contact(other.byKey("won").id), stage: other.byKey("won"), steps: other.steps, createdOn: "2026-01-01", today: TODAY });
    expect(signed.createTasks).toEqual([expect.objectContaining({ kind: "client", dueDate: "2026-12-16" })]);
  });
});
