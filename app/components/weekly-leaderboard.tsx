import Link from "next/link";
import { getTodayStatus } from "@/lib/leetcode/today";
import type { WeeklyPastTotal } from "@/lib/db/queries";
import type { User } from "@/lib/db/schema";
import { shiftDay } from "@/lib/ledger/streaks";
import { formatShortDate } from "@/lib/format";
import { SectionHeading } from "./section-heading";

function weekMeta(weekStart: string): string {
  const weekEnd = shiftDay(weekStart, 6);
  return `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)} PT`;
}

export async function WeeklyLeaderboardSection({
  users,
  weekStart,
  pastTotals,
}: {
  users: User[];
  weekStart: string;
  pastTotals: WeeklyPastTotal[];
}) {
  const statuses = await getTodayStatus(users);
  const liveByUser = new Map<string, number>();
  for (const s of statuses) liveByUser.set(s.userId, s.problemsCount);
  const pastByUser = new Map<string, number>();
  for (const p of pastTotals) pastByUser.set(p.userId, p.problems);

  const rows = users
    .map((u) => ({
      user: u,
      total: (pastByUser.get(u.id) ?? 0) + (liveByUser.get(u.id) ?? 0),
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.user.displayName.localeCompare(b.user.displayName);
    });

  const top = rows[0]?.total ?? 0;
  const leaderActive = top > 0;

  return (
    <section className="mt-16">
      <SectionHeading meta={weekMeta(weekStart)}>Weekly</SectionHeading>
      <ul className="space-y-4">
        {rows.map((r) => {
          const isLeader = leaderActive && r.total === top;
          return (
            <li
              key={r.user.id}
              className="grid grid-cols-[5rem_1fr] items-baseline gap-x-5"
            >
              <Link
                href={`/u/${r.user.leetcodeUsername}`}
                className="text-base font-medium text-zinc-100 no-underline hover:underline"
              >
                {r.user.displayName}
              </Link>
              <span
                className={`font-mono text-sm tabular-nums ${
                  isLeader ? "text-emerald-300" : "text-zinc-300"
                }`}
              >
                {r.total}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WeeklyLeaderboardSkeleton({
  users,
  weekStart,
}: {
  users: User[];
  weekStart: string;
}) {
  return (
    <section className="mt-16">
      <SectionHeading meta={weekMeta(weekStart)}>Weekly</SectionHeading>
      <ul className="animate-pulse space-y-4">
        {users.map((u) => (
          <li
            key={u.id}
            className="grid grid-cols-[5rem_1fr] items-baseline gap-x-5"
          >
            <Link
              href={`/u/${u.leetcodeUsername}`}
              className="text-base font-medium text-zinc-100 no-underline hover:underline"
            >
              {u.displayName}
            </Link>
            <span className="font-mono text-sm tabular-nums text-zinc-500">
              —
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
