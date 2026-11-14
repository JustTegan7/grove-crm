import { describe, expect, it } from "vitest";
import { dollars, hasAccess, includedSeatsForTier, priceLines, seatCheck, totalCents } from "./plans";

describe("priceLines", () => {
  it("solo is flat", () => expect(totalCents(priceLines("solo", { users: 1 }, "month"))).toBe(1900));
  it("team bills per user with a minimum of two", () => {
    expect(totalCents(priceLines("team", { users: 1 }, "month"))).toBe(3000);
    expect(totalCents(priceLines("team", { users: 5 }, "month"))).toBe(7500);
  });
  it("dealership covers 10 users per rooftop then bills extras", () => {
    expect(totalCents(priceLines("dealership", { units: 1, users: 8 }, "month"))).toBe(24900);
    expect(totalCents(priceLines("dealership", { units: 1, users: 13 }, "month"))).toBe(24900 + 3 * 1200);
    expect(totalCents(priceLines("dealership", { units: 2, users: 18 }, "month"))).toBe(2 * 24900);
    expect(totalCents(priceLines("dealership", { units: 2, users: 25 }, "month"))).toBe(2 * 24900 + 5 * 1200);
  });
  it("yearly costs ten months", () => expect(totalCents(priceLines("solo", { users: 1 }, "year"))).toBe(19000));
});

describe("seatCheck", () => {
  it("solo is capped at one user", () => expect(seatCheck({ plan: "solo", users: 1 }).ok).toBe(false));
  it("included packages stop at their seat count", () => {
    expect(seatCheck({ plan: "included", users: 2, includedSeats: 3 }).ok).toBe(true);
    expect(seatCheck({ plan: "included", users: 3, includedSeats: 3 }).ok).toBe(false);
  });
  it("team and dealership can always add", () => {
    expect(seatCheck({ plan: "team", users: 40 }).ok).toBe(true);
    expect(seatCheck({ plan: "dealership", users: 40 }).ok).toBe(true);
  });
});

describe("hasAccess", () => {
  const today = "2026-11-14";
  it("comped and included always work", () => {
    expect(hasAccess({ plan: "comped", status: "none", today })).toBe(true);
    expect(hasAccess({ plan: "included", status: "none", today })).toBe(true);
  });
  it("a trial works until its last day", () => {
    expect(hasAccess({ plan: "team", status: "trialing", trialEndsOn: "2026-11-14", today })).toBe(true);
    expect(hasAccess({ plan: "team", status: "trialing", trialEndsOn: "2026-11-13", today })).toBe(false);
  });
  it("canceled and unfinished checkouts are blocked, past due still works", () => {
    expect(hasAccess({ plan: "team", status: "canceled", today })).toBe(false);
    expect(hasAccess({ plan: "team", status: "incomplete", today })).toBe(false);
    expect(hasAccess({ plan: "team", status: "past_due", today })).toBe(true);
  });
});

describe("helpers", () => {
  it("formats dollars", () => expect(dollars(1900)).toBe("$19"));
  it("maps website tiers to seats", () => {
    expect(includedSeatsForTier("Elite")).toBe(5);
    expect(includedSeatsForTier("nonsense")).toBe(1);
  });
});
