import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getUserByLeetcodeUsername,
  getUserProblemHistory,
  getHeatmapData,
} from "@/lib/db/queries";
import { computeStreak } from "@/lib/ledger/streaks";
import { ptDateString } from "@/lib/cron/close-day";
import { formatShortDate, titleFromSlug } from "@/lib/format";
import { Heatmap } from "@/app/components/heatmap";
import { SectionHeading } from "@/app/components/section-heading";

export const revalidate = 60;
export const dynamic = "force-dynamic";

const HEATMAP_DAYS = 90;

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await getUserByLeetcodeUsername(username);
  if (!user) notFound();

  const today = ptDateString(new Date(), 0);
  const [history, heatmap] = await Promise.all([
    getUserProblemHistory(user.id),
    getHeatmapData(HEATMAP_DAYS, user.id),
  ]);

  const todayRow = history.find((r) => r.day === today);
  const todayMet = !!todayRow && todayRow.problemsCount >= todayRow.target;
  const { current: currentStreak, longest: longestStreak } = computeStreak({
    results: history.map((r) => ({
      day: r.day,
      problemsCount: r.problemsCount,
      target: r.target,
      source: r.source,
    })),
    today,
    todayMet,
  });

  const totalProblems = history.reduce((sum, r) => sum + r.problemsCount, 0);

  const joinedDay = ptDateString(user.createdAt, 0);

  const userLite = {
    id: user.id,
    displayName: user.displayName,
    leetcodeUsername: user.leetcodeUsername,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
      <p className="text-xs italic text-zinc-500">
        <Link href="/" className="no-underline hover:underline">
          ← dashboard
        </Link>
      </p>

      <header className="pb-12 pt-6 text-center">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-zinc-100">
          {user.displayName}
        </h1>
        <p className="mt-2 font-serif text-sm italic text-zinc-500">
          <a
            href={`https://leetcode.com/u/${user.leetcodeUsername}/`}
            target="_blank"
            rel="noreferrer"
          >
            @{user.leetcodeUsername}
          </a>{" "}
          · joined {formatShortDate(joinedDay)} · target {user.dailyTarget}/day
        </p>
        <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-6">
          <Stat value={totalProblems.toString()} label="problems solved" />
          <Stat value={currentStreak.toString()} label="day streak" />
          <Stat value={longestStreak.toString()} label="longest" />
        </div>
      </header>

      <Heatmap
        users={[userLite]}
        cells={heatmap}
        endDay={today}
        daysBack={HEATMAP_DAYS}
      />

      <section className="mt-16">
        <SectionHeading meta={`${totalProblems} solved`}>
          All problems
        </SectionHeading>
        {history.length === 0 ? (
          <p className="text-sm italic text-zinc-500">
            No problems recorded yet. Check back after the next daily close.
          </p>
        ) : (
          <ol className="space-y-5">
            {history
              .filter((r) => r.problemSlugs.length > 0)
              .map((r) => (
                <li
                  key={r.day}
                  className="grid grid-cols-[5rem_1fr] gap-x-5"
                >
                  <span className="pt-px font-serif text-sm italic text-zinc-500">
                    {formatShortDate(r.day)}
                  </span>
                  <ul className="space-y-1.5">
                    {r.problemSlugs.map((slug) => (
                      <li key={slug} className="text-sm text-zinc-300">
                        <a
                          href={`https://leetcode.com/problems/${slug}/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {titleFromSlug(slug)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-3xl tabular-nums text-zinc-100">
        {value}
      </div>
      <div className="mt-1 font-serif text-xs italic text-zinc-500">
        {label}
      </div>
    </div>
  );
}
