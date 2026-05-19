import { describe, expect, it } from "vitest";
import { ptDateString } from "@/lib/cron/close-day";

describe("ptDateString", () => {
  it("yields today's PT date for a noon-UTC anchor", () => {
    // 2026-05-19 12:00 UTC = 05:00 PDT, still 2026-05-19 in PT
    const now = new Date(Date.UTC(2026, 4, 19, 12, 0, 0));
    expect(ptDateString(now, 0)).toBe("2026-05-19");
  });

  it("yields yesterday with offset=-1", () => {
    const now = new Date(Date.UTC(2026, 4, 19, 12, 0, 0));
    expect(ptDateString(now, -1)).toBe("2026-05-18");
  });

  it("rolls back across PT midnight correctly", () => {
    // 2026-05-19 06:00 UTC = 23:00 PDT on 2026-05-18 (still previous day in PT)
    const now = new Date(Date.UTC(2026, 4, 19, 6, 0, 0));
    expect(ptDateString(now, 0)).toBe("2026-05-18");
    expect(ptDateString(now, -1)).toBe("2026-05-17");
  });

  it("handles DST fall-back (Nov 2, 2025)", () => {
    // 2025-11-02 08:00 UTC = 01:00 PDT
    const beforeShift = new Date(Date.UTC(2025, 10, 2, 8, 0, 0));
    expect(ptDateString(beforeShift, 0)).toBe("2025-11-02");
    // 2025-11-02 10:00 UTC = 02:00 PST (after fall-back)
    const afterShift = new Date(Date.UTC(2025, 10, 2, 10, 0, 0));
    expect(ptDateString(afterShift, 0)).toBe("2025-11-02");
  });
});
