import { fetchRecentAcSubmissions } from "./client";
import { dayInTimezone, type AcSubmission } from "./submissions";
import { PT_TIMEZONE, ptDateString } from "@/lib/cron/close-day";
import type { User } from "@/lib/db/schema";

export type TodayUserStatus = {
  userId: string;
  displayName: string;
  problemsCount: number;
  target: number;
  problemSlugs: string[];
  lastSolveTimestamp: number | null;
  /** True if we couldn't talk to LeetCode. */
  error: boolean;
};

export async function getTodayStatus(users: User[]): Promise<TodayUserStatus[]> {
  const today = ptDateString(new Date(), 0);
  return Promise.all(
    users.map(async (u): Promise<TodayUserStatus> => {
      try {
        const subs = await fetchRecentAcSubmissions(u.leetcodeUsername, {
          retries: 2,
          backoffMs: 250,
        });
        const todays = filterToDay(subs, today, PT_TIMEZONE);
        const distinct = new Map<string, AcSubmission>();
        for (const s of todays) distinct.set(s.titleSlug, s);
        const slugs = Array.from(distinct.keys());
        const last = todays.reduce<number | null>(
          (acc, s) => (acc == null || s.timestamp > acc ? s.timestamp : acc),
          null,
        );
        return {
          userId: u.id,
          displayName: u.displayName,
          problemsCount: slugs.length,
          target: u.dailyTarget,
          problemSlugs: slugs,
          lastSolveTimestamp: last,
          error: false,
        };
      } catch {
        return {
          userId: u.id,
          displayName: u.displayName,
          problemsCount: 0,
          target: u.dailyTarget,
          problemSlugs: [],
          lastSolveTimestamp: null,
          error: true,
        };
      }
    }),
  );
}

function filterToDay(
  submissions: AcSubmission[],
  day: string,
  tz: string,
): AcSubmission[] {
  return submissions.filter((s) => dayInTimezone(s.timestamp, tz) === day);
}
