import Link from "next/link";
import type { LedgerEvent, LedgerLog } from "@/lib/db/queries";
import { formatMoney, formatShortDate } from "@/lib/format";
import { SectionHeading } from "./section-heading";

type UserLite = { id: string; displayName: string; leetcodeUsername: string };

export function LedgerLogView({
  users,
  log,
  daysBack,
}: {
  users: UserLite[];
  log: LedgerLog;
  daysBack: number;
}) {
  const nameLink = (id: string): React.ReactNode => {
    const u = users.find((x) => x.id === id);
    if (!u) return id;
    return (
      <Link
        href={`/u/${u.leetcodeUsername}`}
        className="text-zinc-100 no-underline hover:underline"
      >
        {u.displayName}
      </Link>
    );
  };

  if (log.events.length === 0) {
    return (
      <section className="mt-16">
        <SectionHeading meta={`last ${daysBack} days`}>Ledger</SectionHeading>
        <p className="text-sm italic text-zinc-500">
          No missed problems or settlements in this window.
        </p>
      </section>
    );
  }

  // Group events by day for visual rhythm.
  const byDay = new Map<string, LedgerEvent[]>();
  for (const e of log.events) {
    if (!byDay.has(e.day)) byDay.set(e.day, []);
    byDay.get(e.day)!.push(e);
  }
  const days = Array.from(byDay.keys()).sort().reverse();

  return (
    <section className="mt-16">
      <SectionHeading meta={`last ${daysBack} days`}>Ledger</SectionHeading>

      <ol className="space-y-5">
        {days.map((day) => (
          <li key={day} className="grid grid-cols-[5rem_1fr] gap-x-5">
            <span className="pt-px font-serif text-sm italic text-zinc-500">
              {formatShortDate(day)}
            </span>
            <ul className="space-y-1.5">
              {byDay.get(day)!.map((e, i) => (
                <li key={i} className="text-sm text-zinc-300">
                  {renderEvent(e, nameLink)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

function renderEvent(
  e: LedgerEvent,
  nameLink: (id: string) => React.ReactNode,
): React.ReactNode {
  if (e.kind === "miss") {
    const total = e.perCreditorCents * e.creditors.length;
    return (
      <span>
        {nameLink(e.debtorId)} missed{" "}
        <span className="font-mono">{e.missedCount}</span>{" "}
        {e.missedCount === 1 ? "problem" : "problems"} ·{" "}
        <span className="font-mono text-amber-300">−{formatMoney(total)}</span>{" "}
        <span className="text-zinc-500">
          (
          {e.creditors.map((c, i) => (
            <span key={c}>
              {i > 0 && ", "}
              {formatMoney(e.perCreditorCents)} → {nameLink(c)}
            </span>
          ))}
          )
        </span>
      </span>
    );
  }
  return (
    <span>
      {nameLink(e.debtorId)} settled with {nameLink(e.creditorId)}{" "}
      <span className="font-mono text-emerald-400">
        {formatMoney(e.amountCents)}
      </span>
      {e.note && (
        <span className="ml-2 text-zinc-500 italic">{e.note}</span>
      )}
    </span>
  );
}
