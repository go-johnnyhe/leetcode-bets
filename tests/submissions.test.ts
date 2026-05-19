import { describe, expect, it } from "vitest";
import {
  dayInTimezone,
  submissionsToDailyResult,
  type AcSubmission,
} from "@/lib/leetcode/submissions";

const PT = "America/Los_Angeles";

/** Unix sec for a wall-clock instant in a fixed UTC offset. */
function utc(year: number, month: number, day: number, h = 0, m = 0, s = 0): number {
  return Math.floor(Date.UTC(year, month - 1, day, h, m, s) / 1000);
}

function sub(titleSlug: string, timestamp: number, id = "x"): AcSubmission {
  return { id, title: titleSlug, titleSlug, timestamp };
}

describe("dayInTimezone", () => {
  it("returns the PT calendar day for a UTC timestamp", () => {
    // 2026-05-19 03:00 UTC = 2026-05-18 20:00 PDT
    expect(dayInTimezone(utc(2026, 5, 19, 3), PT)).toBe("2026-05-18");
  });

  it("handles PDT → PST fall-back (Nov 2, 2025: 2 AM PDT → 1 AM PST)", () => {
    // 2025-11-02 08:30 UTC = 01:30 PDT (still day "2025-11-02")
    expect(dayInTimezone(utc(2025, 11, 2, 8, 30), PT)).toBe("2025-11-02");
    // 2025-11-02 09:30 UTC = 01:30 PST (after fall-back, still same day)
    expect(dayInTimezone(utc(2025, 11, 2, 9, 30), PT)).toBe("2025-11-02");
  });

  it("handles PST → PDT spring-forward (Mar 8, 2026: 2 AM PST → 3 AM PDT)", () => {
    // 2026-03-08 09:30 UTC = 01:30 PST (before jump)
    expect(dayInTimezone(utc(2026, 3, 8, 9, 30), PT)).toBe("2026-03-08");
    // 2026-03-08 10:30 UTC = 03:30 PDT (after jump, still same day)
    expect(dayInTimezone(utc(2026, 3, 8, 10, 30), PT)).toBe("2026-03-08");
  });
});

describe("submissionsToDailyResult", () => {
  const target = 2;

  it("returns 0 problems / missed=2 for empty submissions", () => {
    expect(submissionsToDailyResult([], "2026-05-18", PT, target)).toEqual({
      problemsCount: 0,
      problemSlugs: [],
      missed: 2,
    });
  });

  it("counts 2 distinct problems solved on the target PT day", () => {
    // Both at 20:00 PDT on 2026-05-18 = 03:00 UTC on 2026-05-19
    const subs = [
      sub("two-sum", utc(2026, 5, 19, 3, 0, 0)),
      sub("three-sum", utc(2026, 5, 19, 3, 1, 0)),
    ];
    const r = submissionsToDailyResult(subs, "2026-05-18", PT, target);
    expect(r.problemsCount).toBe(2);
    expect(r.missed).toBe(0);
    expect(r.problemSlugs.sort()).toEqual(["three-sum", "two-sum"]);
  });

  it("dedupes repeated solves of the same problem", () => {
    const subs = [
      sub("two-sum", utc(2026, 5, 19, 3, 0, 0), "a"),
      sub("two-sum", utc(2026, 5, 19, 3, 5, 0), "b"),
      sub("two-sum", utc(2026, 5, 19, 4, 0, 0), "c"),
    ];
    const r = submissionsToDailyResult(subs, "2026-05-18", PT, target);
    expect(r.problemsCount).toBe(1);
    expect(r.missed).toBe(1);
  });

  it("counts a submission at 23:59:59 PT as the target day", () => {
    // 2026-05-19 06:59:59 UTC = 2026-05-18 23:59:59 PDT
    const subs = [sub("two-sum", utc(2026, 5, 19, 6, 59, 59))];
    const r = submissionsToDailyResult(subs, "2026-05-18", PT, target);
    expect(r.problemsCount).toBe(1);
  });

  it("excludes a submission at 00:00:00 PT next day", () => {
    // 2026-05-19 07:00:00 UTC = 2026-05-19 00:00:00 PDT
    const subs = [sub("two-sum", utc(2026, 5, 19, 7, 0, 0))];
    const r = submissionsToDailyResult(subs, "2026-05-18", PT, target);
    expect(r.problemsCount).toBe(0);
    expect(r.missed).toBe(2);
  });

  it("missed=1 when only 1 of 2 problems solved", () => {
    const subs = [sub("two-sum", utc(2026, 5, 19, 3))];
    const r = submissionsToDailyResult(subs, "2026-05-18", PT, target);
    expect(r.missed).toBe(1);
  });

  it("respects per-user daily_target", () => {
    const subs = [
      sub("a", utc(2026, 5, 19, 3, 0)),
      sub("b", utc(2026, 5, 19, 3, 1)),
    ];
    expect(submissionsToDailyResult(subs, "2026-05-18", PT, 3).missed).toBe(1);
    expect(submissionsToDailyResult(subs, "2026-05-18", PT, 2).missed).toBe(0);
  });
});
