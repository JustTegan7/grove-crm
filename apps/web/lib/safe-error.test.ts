import { describe, expect, it, vi } from "vitest";
import { safeMessage } from "./safe-error";

describe("safeMessage", () => {
  it("passes friendly messages through", () => {
    expect(safeMessage(new Error("That task was not found."))).toBe("That task was not found.");
    expect(safeMessage(new Error("Pick today or a later day."))).toBe("Pick today or a later day.");
  });
  it("hides database and network details", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const m of [
      'Failed query: select "id" from "contacts" where "workspace_id" = $1 params: abc',
      'relation "subscriptions" does not exist',
      'duplicate key value violates unique constraint "x"',
      "fetch failed",
      "connect ECONNREFUSED 10.0.0.1:5432",
    ]) {
      expect(safeMessage(new Error(m))).toBe("Something went wrong. Try again.");
    }
  });
  it("handles non-errors", () => expect(safeMessage("boom")).toBe("Something went wrong. Try again."));
});
