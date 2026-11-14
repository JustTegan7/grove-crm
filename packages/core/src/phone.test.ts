import { describe, expect, it } from "vitest";
import { dialable, isValidPhone } from "./phone";

describe("isValidPhone", () => {
  it("accepts common US formats", () => {
    for (const p of ["(425) 555-0123", "425-555-0123", "425.555.0123", "4255550123", "1 425 555 0123"]) expect(isValidPhone(p)).toBe(true);
  });
  it("accepts international numbers", () => {
    for (const p of ["+44 20 7946 0958", "+61 2 9374 4000", "+52 55 1234 5678", "+4915123456789"]) expect(isValidPhone(p)).toBe(true);
  });
  it("accepts extensions", () => {
    expect(isValidPhone("(425) 555-0123 x45")).toBe(true);
    expect(isValidPhone("425-555-0123 ext. 12")).toBe(true);
  });
  it("rejects things that are not phone numbers", () => {
    for (const p of ["call me", "12345", "1234567890123456", "425-555-CALL", "++14255550123", "425+5550123", "abc"]) expect(isValidPhone(p)).toBe(false);
  });
});

describe("dialable", () => {
  it("keeps the plus and digits, drops formatting and extensions", () => {
    expect(dialable("(425) 555-0123 x45")).toBe("4255550123");
    expect(dialable("+44 20 7946 0958")).toBe("+442079460958");
    expect(dialable(null)).toBe("");
  });
});
