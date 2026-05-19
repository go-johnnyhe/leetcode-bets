export type AcSubmission = {
  id: string;
  title: string;
  titleSlug: string;
  /** Unix seconds, UTC. */
  timestamp: number;
};

export type DailyResultComputed = {
  problemsCount: number;
  problemSlugs: string[];
  missed: number;
};

/**
 * Returns the YYYY-MM-DD calendar date for a Unix-second timestamp,
 * as observed in the given IANA timezone. DST-correct via Intl.
 */
export function dayInTimezone(unixSec: number, tz: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(unixSec * 1000));
}

/**
 * Reduces a flat list of recent AC submissions to a daily result for one user
 * on a single calendar day in the given timezone. Distinct titleSlugs only.
 */
export function submissionsToDailyResult(
  submissions: AcSubmission[],
  targetDay: string,
  tz: string,
  target: number,
): DailyResultComputed {
  const seen = new Map<string, true>();
  for (const s of submissions) {
    if (dayInTimezone(s.timestamp, tz) !== targetDay) continue;
    seen.set(s.titleSlug, true);
  }
  const problemSlugs = Array.from(seen.keys());
  const problemsCount = problemSlugs.length;
  const missed = Math.max(0, target - problemsCount);
  return { problemsCount, problemSlugs, missed };
}
