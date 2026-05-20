import { Suspense } from "react";
import {
  getAllUsers,
  getBalanceMatrix,
  getHeatmapData,
  getHeroStats,
  getLedgerLog,
} from "@/lib/db/queries";
import { ptDateString, PT_TIMEZONE } from "@/lib/cron/close-day";
import { Hero } from "./components/hero";
import { TodaySection, TodaySkeleton } from "./components/today";
import { Balances } from "./components/balances";
import { Heatmap } from "./components/heatmap";
import { LedgerLogView } from "./components/ledger-log";
import { formatShortDate } from "@/lib/format";

export const revalidate = 60;
// Page can't prerender at build (DB env is request-time on Vercel).
// LeetCode fetches are cached separately via unstable_cache in lib/leetcode/today.ts.
export const dynamic = "force-dynamic";

/** Heatmap auto-fits the data: at least MIN_DAYS, capped at MAX_DAYS. */
const HEATMAP_MIN_DAYS = 14;
const HEATMAP_MAX_DAYS = 90;
const LEDGER_DAYS = 30;

export default async function Dashboard() {
  const users = await getAllUsers();
  const today = ptDateString(new Date(), 0);

  // Hero stats first so we can size the heatmap to the actual data range.
  const heroStats = await getHeroStats();

  const heatmapDays = (() => {
    if (!heroStats.earliestDay) return HEATMAP_MIN_DAYS;
    const ms =
      Date.now() - new Date(`${heroStats.earliestDay}T12:00:00Z`).getTime();
    const span = Math.floor(ms / 86_400_000) + 1;
    return Math.min(HEATMAP_MAX_DAYS, Math.max(HEATMAP_MIN_DAYS, span));
  })();

  // Fast DB queries — these gate the initial shell.
  // The slow LeetCode-dependent Today section streams in via Suspense below.
  const [balances, heatmap, ledger] = await Promise.all([
    getBalanceMatrix(),
    getHeatmapData(heatmapDays),
    getLedgerLog(LEDGER_DAYS),
  ]);

  const refreshedAt = formatTime(new Date());
  const hoursToDeadline = hoursUntilDeadlinePT(new Date());

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-16">
      <Hero stats={heroStats} today={formatShortDate(today)} />

      <Suspense
        fallback={<TodaySkeleton users={users} refreshedAt={refreshedAt} />}
      >
        <TodaySection
          users={users}
          today={today}
          hoursToDeadline={hoursToDeadline}
          refreshedAt={refreshedAt}
        />
      </Suspense>

      <Balances
        users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
        balances={balances}
      />

      <Heatmap
        users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
        cells={heatmap}
        endDay={today}
        daysBack={heatmapDays}
      />

      <LedgerLogView
        users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
        log={ledger}
        daysBack={LEDGER_DAYS}
      />

      <footer className="mt-20 border-t border-zinc-800 pt-5 text-xs italic text-zinc-500">
        revalidates every 60 s · cron closes the day at 00:05 PT
      </footer>
    </main>
  );
}

function formatTime(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PT_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
}

function hoursUntilDeadlinePT(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PT_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const minutesNow = hour * 60 + minute;
  const deadlineMinutes = 23 * 60 + 59;
  const remaining = deadlineMinutes - minutesNow;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / 60);
}
