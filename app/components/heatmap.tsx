import type { HeatmapCell } from "@/lib/db/queries";
import { shiftDay } from "@/lib/ledger/streaks";
import { SectionHeading } from "./section-heading";

type UserLite = { id: string; displayName: string };

export function Heatmap({
  users,
  cells,
  endDay,
  daysBack,
}: {
  users: UserLite[];
  cells: HeatmapCell[];
  endDay: string;
  daysBack: number;
}) {
  const byUser = new Map<string, Map<string, HeatmapCell>>();
  const earliestByUser = new Map<string, string>();
  for (const c of cells) {
    if (!byUser.has(c.userId)) byUser.set(c.userId, new Map());
    byUser.get(c.userId)!.set(c.day, c);
    const cur = earliestByUser.get(c.userId);
    if (!cur || c.day < cur) earliestByUser.set(c.userId, c.day);
  }

  const days: string[] = [];
  for (let i = daysBack - 1; i >= 0; i--) days.push(shiftDay(endDay, -i));

  return (
    <section className="mt-16">
      <SectionHeading meta={`last ${daysBack} days`}>Activity</SectionHeading>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {users.map((u) => (
            <div key={u.id} className="mb-2 flex items-center gap-4">
              <span className="w-20 shrink-0 text-sm text-zinc-300">
                {u.displayName}
              </span>
              <div className="flex gap-[3px]">
                {days.map((d) => (
                  <Cell
                    key={d}
                    day={d}
                    user={u}
                    data={byUser.get(u.id)?.get(d)}
                    earliest={earliestByUser.get(u.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Legend />
    </section>
  );
}

function Cell({
  day,
  data,
  earliest,
}: {
  day: string;
  user: UserLite;
  data: HeatmapCell | undefined;
  earliest: string | undefined;
}) {
  const preJoin = !!(earliest && day < earliest);
  const noData = !data;

  let className: string;
  let title: string;

  if (preJoin) {
    className = "border border-zinc-800/60";
    title = `${day} · not yet joined`;
  } else if (noData) {
    className = "border border-zinc-800/40";
    title = `${day} · no data`;
  } else if (data.source === "pending_fetch") {
    className = "border border-amber-300/50";
    title = `${day} · pending fetch`;
  } else if (data.problemsCount < data.target) {
    const missed = data.target - data.problemsCount;
    className = "bg-amber-300/25";
    title =
      data.problemsCount === 0
        ? `${day} · missed both`
        : `${day} · ${data.problemsCount}/${data.target} (missed ${missed})`;
  } else if (data.problemsCount > data.target) {
    className = "bg-emerald-400/90 ring-1 ring-emerald-300/40";
    title = `${day} · ${data.problemsCount}/${data.target} (bonus)`;
  } else {
    className = "bg-emerald-500/65";
    title = `${day} · ${data.problemsCount}/${data.target}`;
  }

  return (
    <span
      title={title}
      className={`block h-3 w-3 shrink-0 rounded-[2px] ${className}`}
    />
  );
}

function Legend() {
  const items: Array<{ className: string; label: string }> = [
    { className: "bg-emerald-500/65", label: "on target" },
    { className: "bg-emerald-400/90 ring-1 ring-emerald-300/40", label: "bonus" },
    { className: "bg-amber-300/25", label: "missed" },
    { className: "border border-zinc-800/60", label: "no data" },
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={`block h-2.5 w-2.5 rounded-[2px] ${it.className}`} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
