import { describe, expect, it } from "vitest";
import { dollars, hasAccess, includedSeatsForTier, priceLines, seatCheck, totalCents } from "./plans";

describe("priceLines", () => {
  it("solo is flat", () => expect(totalCents(priceLines("solo", { users: 1 }, "month"))).toBe(1200));
  it("team bills per user with a minimum of two", () => {
    expect(totalCents(priceLines("team", { users: 1 }, "month"))).toBe(2000);
    expect(totalCents(priceLines("team", { users: 5 }, "month"))).toBe(5000);
  });
  it("dealership covers 10 users per rooftop then bills extras", () => {
    expect(totalCents(priceLines("dealership", { units: 1, users: 8 }, "month"))).toBe(29900);
    expect(totalCents(priceLines("dealership", { units: 1, users: 13 }, "month"))).toBe(29900 + 3 * 1500);
    expect(totalCents(priceLines("dealership", { units: 2, users: 18 }, "month"))).toBe(2 * 29900);
    expect(totalCents(priceLines("dealership", { units: 2, users: 25 }, "month"))).toBe(2 * 29900 + 5 * 1500);
  });
  it("yearly costs ten months", () => expect(totalCents(priceLines("solo", { users: 1 }, "year"))).toBe(12000));
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
  it("formats dollars", () => expect(dollars(1200)).toBe("$12"));
  it("maps website tiers to seats", () => {
    expect(includedSeatsForTier("Elite")).toBe(5);
    expect(includedSeatsForTier("Growth")).toBe(3);
    expect(includedSeatsForTier("Basic")).toBe(0);
    expect(includedSeatsForTier("Ultra-Lite")).toBe(0);
    expect(includedSeatsForTier("nonsense")).toBe(0);
  });
});
