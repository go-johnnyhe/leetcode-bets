import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dailyResults, ledgerEntries, users } from "@/lib/db/schema";
import {
  fetchRecentAcSubmissions,
  LeetCodeFetchError,
  type FetchOptions,
} from "@/lib/leetcode/client";
import { submissionsToDailyResult } from "@/lib/leetcode/submissions";
import { computeLedgerEntries } from "@/lib/ledger/compute";

export const PT_TIMEZONE = "America/Los_Angeles";

/**
 * Returns the PT calendar date offset by `offsetDays` from "now".
 * `closeDayHandler` uses offset -1 to close yesterday.
 */
export function ptDateString(now: Date, offsetDays = 0): string {
  const ms = now.getTime() + offsetDays * 86400_000;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export type CloseDayOptions = {
  /** Override the target day (otherwise uses yesterday in PT). */
  day?: string;
  /** Inject fetch (used in tests). */
  fetchImpl?: FetchOptions["fetchImpl"];
};

export type CloseDayUserOutcome = {
  userId: string;
  day: string;
  status: "skipped" | "wrote" | "pending" | "rewrote";
  problemsCount?: number;
  missed?: number;
  ledgerEntriesWritten?: number;
  error?: string;
};

export type CloseDayResult = {
  day: string;
  outcomes: CloseDayUserOutcome[];
};

/**
 * Idempotent: safe to re-run on the same day. For each user:
 *  - if a `cron`-source row already exists, skip
 *  - else fetch LeetCode, compute result + ledger, upsert
 *  - if fetch fails, write a `pending_fetch` row so the next run retries
 */
export async function closeDayHandler(opts: CloseDayOptions = {}): Promise<CloseDayResult> {
  const targetDay = opts.day ?? ptDateString(new Date(), -1);
  const allUsers = await db.select().from(users).orderBy(users.id);
  const userIds = allUsers.map((u) => u.id);

  const outcomes: CloseDayUserOutcome[] = [];

  for (const user of allUsers) {
    const existing = await db
      .select({ source: dailyResults.source })
      .from(dailyResults)
      .where(
        sql`${dailyResults.userId} = ${user.id} AND ${dailyResults.day} = ${targetDay}`,
      )
      .limit(1);

    // Any non-pending row is authoritative (cron, imported, manual_fix).
    if (existing[0] && existing[0].source !== "pending_fetch") {
      outcomes.push({ userId: user.id, day: targetDay, status: "skipped" });
      continue;
    }

    const otherIds = userIds.filter((id) => id !== user.id);

    try {
      const submissions = await fetchRecentAcSubmissions(user.leetcodeUsername, {
        fetchImpl: opts.fetchImpl,
        backoffMs: 500,
      });
      const computed = submissionsToDailyResult(
        submissions,
        targetDay,
        PT_TIMEZONE,
        user.dailyTarget,
      );

      const wasPending = existing[0]?.source === "pending_fetch";

      await db
        .insert(dailyResults)
        .values({
          userId: user.id,
          day: targetDay,
          problemsCount: computed.problemsCount,
          problemSlugs: computed.problemSlugs,
          missed: computed.missed,
          source: "cron",
        })
        .onConflictDoUpdate({
          target: [dailyResults.userId, dailyResults.day],
          set: {
            problemsCount: computed.problemsCount,
            problemSlugs: computed.problemSlugs,
            missed: computed.missed,
            source: "cron",
            computedAt: sql`now()`,
          },
        });

      const entries = computeLedgerEntries(
        targetDay,
        user.id,
        otherIds,
        computed.missed,
      );
      let entriesWritten = 0;
      if (entries.length > 0) {
        const result = await db
          .insert(ledgerEntries)
          .values(entries)
          .onConflictDoNothing();
        entriesWritten = entries.length;
        void result;
      }

      outcomes.push({
        userId: user.id,
        day: targetDay,
        status: wasPending ? "rewrote" : "wrote",
        problemsCount: computed.problemsCount,
        missed: computed.missed,
        ledgerEntriesWritten: entriesWritten,
      });

      // Polite spacing between users to avoid even the suggestion of rate limiting.
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      const message = err instanceof LeetCodeFetchError ? err.message : String(err);
      await db
        .insert(dailyResults)
        .values({
          userId: user.id,
          day: targetDay,
          problemsCount: -1,
          problemSlugs: [],
          missed: 0,
          source: "pending_fetch",
        })
        .onConflictDoUpdate({
          target: [dailyResults.userId, dailyResults.day],
          set: {
            problemsCount: -1,
            problemSlugs: [],
            missed: 0,
            source: "pending_fetch",
            computedAt: sql`now()`,
          },
        });
      outcomes.push({
        userId: user.id,
        day: targetDay,
        status: "pending",
        error: message,
      });
    }
  }

  return { day: targetDay, outcomes };
}

export async function getUserById(userId: string) {
  return db.select().from(users).where(eq(users.id, userId)).limit(1);
}
