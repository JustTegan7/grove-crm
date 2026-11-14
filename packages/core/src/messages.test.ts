import { describe, expect, it } from "vitest";
import { defaultMessageTemplates, firstName, renderMessage, unknownFields } from "./messages";
import { templateForAccountType, templates, ACCOUNT_TYPES } from "./templates";

describe("renderMessage", () => {
  it("fills known fields", () => {
    expect(renderMessage("Hi {{first_name}} at {{business}}", { first_name: "Sam", business: "Mill Creek Auto" })).toBe("Hi Sam at Mill Creek Auto");
  });
  it("is case and space tolerant", () => {
    expect(renderMessage("Hi {{ First_Name }}", { first_name: "Sam" })).toBe("Hi Sam");
  });
  it("falls back when a value is missing or blank", () => {
    expect(renderMessage("Hi {{first_name}}, about {{business}}", { first_name: "  ", business: null })).toBe("Hi there, about your business");
  });
  it("leaves unknown fields visible", () => {
    expect(renderMessage("Hi {{nmae}}", {})).toBe("Hi {{nmae}}");
  });
});

describe("helpers", () => {
  it("takes the first name", () => {
    expect(firstName("Sam Rivera")).toBe("Sam");
    expect(firstName("  ")).toBeNull();
    expect(firstName(null)).toBeNull();
  });
  it("lists unknown fields", () => {
    expect(unknownFields("{{business}} {{oops}} {{Bad}}")).toEqual(["oops", "Bad"]);
  });
  it("default templates only use known fields", () => {
    for (const t of defaultMessageTemplates) {
      expect(unknownFields(t.body)).toEqual([]);
      if (t.subject) expect(unknownFields(t.subject)).toEqual([]);
    }
  });
});

describe("industry templates", () => {
  it("every account type maps to a real template with the stage fields the engine needs", () => {
    for (const a of ACCOUNT_TYPES) {
      const t = templates[templateForAccountType[a]];
      expect(t).toBeDefined();
      expect(t.stages.filter((s) => s.isDefaultNew)).toHaveLength(1);
      expect(t.stages.some((s) => s.group === "won" && s.checkinDays)).toBe(true);
      expect(t.stages.some((s) => s.group === "parked" && s.resurfaceDays)).toBe(true);
      expect(t.stages.some((s) => s.group === "parked" && s.clearsTasks && !s.resurfaceDays)).toBe(true);
      expect(new Set(t.stages.map((s) => s.key)).size).toBe(t.stages.length);
    }
  });
});
