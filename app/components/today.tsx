import type { TodayUserStatus } from "@/lib/leetcode/today";
import { titleFromSlug } from "@/lib/format";
import { SectionHeading } from "./section-heading";

export type TodayRow = TodayUserStatus & {
  streak: number;
  longestStreak: number;
  /** Title slug of the most recent solve today, or null. */
  lastSlug: string | null;
};

export function Today({
  rows,
  hoursToDeadline,
  refreshedAt,
}: {
  rows: TodayRow[];
  hoursToDeadline: number;
  refreshedAt: string;
}) {
  const lateAndAtRisk = hoursToDeadline <= 4;

  return (
    <section className="mt-16">
      <SectionHeading meta={`refreshed ${refreshedAt} PT`}>Today</SectionHeading>
      <ul className="space-y-7">
        {rows.map((u) => (
          <li
            key={u.userId}
            className="grid grid-cols-[5rem_1fr] gap-x-5 gap-y-1.5"
          >
            <span className="text-base font-medium text-zinc-100">
              {u.displayName}
            </span>
            <div className="flex items-center gap-5">
              <ProgressBar count={u.problemsCount} target={u.target} />
              <span className="font-mono text-sm tabular-nums text-zinc-300">
                {u.problemsCount} / {u.target}
                {u.problemsCount > u.target && (
                  <span className="ml-2 text-amber-300">
                    +{u.problemsCount - u.target}
                  </span>
                )}
              </span>
              <Status
                user={u}
                hoursToDeadline={hoursToDeadline}
                lateAndAtRisk={lateAndAtRisk}
              />
            </div>
            <span aria-hidden />
            <StreakLine
              userStreak={u.streak}
              longest={u.longestStreak}
              lastSlug={u.lastSlug}
              problemsCount={u.problemsCount}
              hoursToDeadline={hoursToDeadline}
              lateAndAtRisk={lateAndAtRisk}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProgressBar({ count, target }: { count: number; target: number }) {
  const filled = Math.min(count, target);
  const overflow = Math.max(0, count - target);
  const cells = Array.from({ length: target }, (_, i) => i < filled);
  return (
    <div className="flex shrink-0 items-center gap-1">
      {cells.map((on, i) => (
        <span
          key={i}
          className={`h-2 w-7 rounded-sm ${on ? "bg-emerald-500/80" : "bg-zinc-800"}`}
        />
      ))}
      {overflow > 0 &&
        Array.from({ length: overflow }, (_, i) => (
          <span
            key={`o${i}`}
            className="ml-0.5 h-1.5 w-1.5 rounded-full bg-amber-300/80"
            title="bonus problem"
          />
        ))}
    </div>
  );
}

function Status({
  user,
  hoursToDeadline,
  lateAndAtRisk,
}: {
  user: TodayRow;
  hoursToDeadline: number;
  lateAndAtRisk: boolean;
}) {
  if (user.error) {
    return (
      <span className="ml-auto text-sm text-zinc-500">rechecking…</span>
    );
  }
  if (user.problemsCount >= user.target) {
    return (
      <span className="ml-auto text-sm text-emerald-400">
        {user.problemsCount > user.target ? "overdrive" : "done ✓"}
      </span>
    );
  }
  if (lateAndAtRisk) {
    return (
      <span className="ml-auto text-sm text-amber-300">
        {hoursToDeadline}h to deadline
      </span>
    );
  }
  return (
    <span className="ml-auto text-sm text-zinc-500">
      {user.target - user.problemsCount} to go
    </span>
  );
}

function StreakLine({
  userStreak,
  longest,
  lastSlug,
  problemsCount,
  hoursToDeadline,
  lateAndAtRisk,
}: {
  userStreak: number;
  longest: number;
  lastSlug: string | null;
  problemsCount: number;
  hoursToDeadline: number;
  lateAndAtRisk: boolean;
}) {
  const left =
    userStreak === 0
      ? longest > 0
        ? `streak 0 · longest ${longest}`
        : "no streak yet"
      : userStreak === longest && userStreak > 1
        ? `streak ${userStreak} · personal best`
        : `streak ${userStreak} · longest ${longest}`;

  let right: React.ReactNode = null;
  if (lastSlug) {
    right = (
      <>
        last solve{" "}
        <a
          href={`https://leetcode.com/problems/${lastSlug}/`}
          target="_blank"
          rel="noreferrer"
          className="text-zinc-300 hover:text-zinc-100"
        >
          {titleFromSlug(lastSlug)} →
        </a>
      </>
    );
  } else if (problemsCount === 0) {
    right = lateAndAtRisk ? (
      <span className="text-amber-300">{hoursToDeadline}h until 11:59 PM</span>
    ) : (
      <span>no solves yet today</span>
    );
  }

  return (
    <p className="text-sm text-zinc-500">
      <span>{left}</span>
      {right && <span className="ml-2">· {right}</span>}
    </p>
  );
}
