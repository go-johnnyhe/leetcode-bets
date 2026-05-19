import { describe, expect, it } from "vitest";
import { computeStreak, shiftDay } from "@/lib/ledger/streaks";

function row(day: string, count: number, target = 2, source = "cron") {
  return { day, problemsCount: count, target, source };
}

describe("shiftDay", () => {
  it("adds and subtracts days", () => {
    expect(shiftDay("2026-05-19", -1)).toBe("2026-05-18");
    expect(shiftDay("2026-05-19", 1)).toBe("2026-05-20");
    expect(shiftDay("2026-05-01", -1)).toBe("2026-04-30");
  });

  it("is DST-stable", () => {
    // Spring forward day in PT (Mar 8, 2026). Walking back one day shouldn't lose 23h.
    expect(shiftDay("2026-03-09", -1)).toBe("2026-03-08");
    expect(shiftDay("2026-03-08", -1)).toBe("2026-03-07");
  });
});

describe("computeStreak", () => {
  it("returns zeros when there are no results and today not met", () => {
    expect(
      computeStreak({ results: [], today: "2026-05-19", todayMet: false }),
    ).toEqual({ current: 0, longest: 0 });
  });

  it("counts today even with no prior results", () => {
    expect(
      computeStreak({ results: [], today: "2026-05-19", todayMet: true }),
    ).toEqual({ current: 1, longest: 1 });
  });

  it("counts a contiguous run through yesterday with today not met", () => {
    const results = [
      row("2026-05-15", 2),
      row("2026-05-16", 2),
      row("2026-05-17", 2),
      row("2026-05-18", 2),
    ];
    expect(computeStreak({ results, today: "2026-05-19", todayMet: false }))
      .toEqual({ current: 4, longest: 4 });
  });

  it("extends the run to include today when today is met", () => {
    const results = [
      row("2026-05-17", 2),
      row("2026-05-18", 2),
    ];
    expect(computeStreak({ results, today: "2026-05-19", todayMet: true }))
      .toEqual({ current: 3, longest: 3 });
  });

  it("breaks on a miss day", () => {
    const results = [
      row("2026-05-15", 2),
      row("2026-05-16", 0), // miss
      row("2026-05-17", 2),
      row("2026-05-18", 2),
    ];
    expect(computeStreak({ results, today: "2026-05-19", todayMet: false }))
      .toEqual({ current: 2, longest: 2 });
  });

  it("breaks on a calendar gap (no row for a day)", () => {
    const results = [
      row("2026-05-15", 2),
      row("2026-05-16", 2),
      // 17 missing entirely
      row("2026-05-18", 2),
    ];
    expect(computeStreak({ results, today: "2026-05-19", todayMet: false }))
      .toEqual({ current: 1, longest: 2 });
  });

  it("pending_fetch rows do NOT count as a pass", () => {
    const results = [
      row("2026-05-17", 2),
      row("2026-05-18", -1, 2, "pending_fetch"),
    ];
    expect(computeStreak({ results, today: "2026-05-19", todayMet: false }))
      .toEqual({ current: 0, longest: 1 });
  });

  it("longest can exceed current when an older run was longer", () => {
    const results = [
      row("2026-05-10", 2),
      row("2026-05-11", 2),
      row("2026-05-12", 2),
      row("2026-05-13", 2), // 4-day run
      row("2026-05-14", 0), // miss
      row("2026-05-15", 2),
      row("2026-05-16", 2), // 2-day run
    ];
    const r = computeStreak({
      results,
      today: "2026-05-17",
      todayMet: false,
    });
    expect(r.current).toBe(2);
    expect(r.longest).toBe(4);
  });

  it("does not walk before the user's earliest result", () => {
    // Only 3 days exist (user joined recently). Streak shouldn't infer pre-join misses.
    const results = [
      row("2026-05-17", 2),
      row("2026-05-18", 2),
    ];
    expect(computeStreak({ results, today: "2026-05-19", todayMet: true }))
      .toEqual({ current: 3, longest: 3 });
  });

  it("bonus problems still pass the streak", () => {
    const results = [
      row("2026-05-17", 4), // bonus
      row("2026-05-18", 2),
    ];
    expect(computeStreak({ results, today: "2026-05-19", todayMet: true }))
      .toEqual({ current: 3, longest: 3 });
  });
});
