import type { HeroStats } from "@/lib/db/queries";
import { formatMoney } from "@/lib/format";

export function Hero({
  stats,
  today,
}: {
  stats: HeroStats;
  today: string;
}) {
  return (
    <header className="pb-12 pt-2 text-center">
      <h1 className="font-serif text-4xl font-medium tracking-tight text-zinc-100">
        leetcode-bet
      </h1>
      <p className="mt-2 font-serif text-sm italic text-zinc-500">
        accountability for the four of us · {today} PT
      </p>
      <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-6">
        <Stat value={stats.totalProblems.toString()} label="problems solved" />
        <Stat value={formatMoney(stats.totalCentsFlowed)} label="changed hands" />
        <Stat
          value={stats.daysRunning.toString()}
          label={stats.daysRunning === 1 ? "day running" : "days running"}
        />
      </div>
    </header>
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
