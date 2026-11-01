import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../db", () => ({ db: () => { throw new Error("no db in tests"); } }));

import { makeUndo, readUndo } from "./undo";
import type { Ctx } from "./ctx";

const ctx: Ctx = { userId: "u1", name: "T", email: "t@x.com", role: "owner", workspace: { id: "ws1", name: "W", timezone: "America/Los_Angeles" }, today: "2026-11-01" };
const TASK = "00000000-0000-7000-8000-000000000001";

beforeAll(() => { process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret"; });
afterEach(() => vi.useRealTimers());

describe("undo tokens", () => {
  it("round-trips for the same person and workspace", () => {
    const t = makeUndo(ctx, { reopenTaskId: TASK });
    expect(readUndo(ctx, t).reopenTaskId).toBe(TASK);
  });
  it("rejects a tampered token", () => {
    const t = makeUndo(ctx, { reopenTaskId: TASK });
    const [body, sig] = t.split(".");
    const forged = Buffer.from(Buffer.from(body, "base64url").toString().replace("u1", "u2")).toString("base64url");
    expect(() => readUndo(ctx, `${forged}.${sig}`)).toThrow(/not valid/);
    expect(() => readUndo(ctx, "junk")).toThrow(/not valid/);
  });
  it("rejects someone else's token", () => {
    const t = makeUndo(ctx, { reopenTaskId: TASK });
    expect(() => readUndo({ ...ctx, userId: "u2" }, t)).toThrow(/not yours/);
    expect(() => readUndo({ ...ctx, workspace: { ...ctx.workspace, id: "ws2" } }, t)).toThrow(/not yours/);
  });
  it("expires after two minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T10:00:00Z"));
    const t = makeUndo(ctx, { reopenTaskId: TASK });
    vi.setSystemTime(new Date("2026-11-01T10:02:01Z"));
    expect(() => readUndo(ctx, t)).toThrow(/Too late/);
  });
});
