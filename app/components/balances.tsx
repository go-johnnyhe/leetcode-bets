import Link from "next/link";
import { settleAction } from "../actions";
import { formatMoney } from "@/lib/format";
import { SectionHeading } from "./section-heading";

type UserLite = { id: string; displayName: string; leetcodeUsername: string };
type Balance = { debtorId: string; creditorId: string; amountCents: number };

export function Balances({
  users,
  balances,
}: {
  users: UserLite[];
  balances: Balance[];
}) {
  const lookup = new Map<string, number>();
  for (const b of balances) lookup.set(`${b.debtorId}|${b.creditorId}`, b.amountCents);

  const nameOf = (id: string) =>
    users.find((u) => u.id === id)?.displayName ?? id;

  const owed = balances.filter((b) => b.amountCents > 0);
  const allClear = owed.length === 0;

  return (
    <section className="mt-16">
      <SectionHeading meta="row owes column">Balances</SectionHeading>
      <table className="w-full text-sm">
        <thead className="text-zinc-500">
          <tr>
            <th className="py-2 text-left font-normal" />
            {users.map((u) => (
              <th key={u.id} className="py-2 text-right font-normal">
                <Link
                  href={`/u/${u.leetcodeUsername}`}
                  className="no-underline hover:underline"
                >
                  {u.displayName}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((debtor) => (
            <tr key={debtor.id} className="border-t border-zinc-800">
              <td className="py-3 pr-4 text-zinc-200">
                <Link
                  href={`/u/${debtor.leetcodeUsername}`}
                  className="no-underline hover:underline"
                >
                  {debtor.displayName}
                </Link>
              </td>
              {users.map((creditor) => {
                if (debtor.id === creditor.id) {
                  return (
                    <td
                      key={creditor.id}
                      className="py-3 text-right font-mono text-zinc-700"
                    >
                      ·
                    </td>
                  );
                }
                const cents = lookup.get(`${debtor.id}|${creditor.id}`) ?? 0;
                return (
                  <td
                    key={creditor.id}
                    className={`py-3 text-right font-mono tabular-nums ${
                      cents > 0 ? "text-amber-300" : "text-zinc-600"
                    }`}
                  >
                    {formatMoney(cents)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {allClear ? (
        <p className="mt-6 text-sm italic text-zinc-500">all settled up.</p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {owed.map((pair) => (
            <form
              key={`${pair.debtorId}-${pair.creditorId}`}
              action={settleAction}
            >
              <input type="hidden" name="debtorId" value={pair.debtorId} />
              <input type="hidden" name="creditorId" value={pair.creditorId} />
              <input type="hidden" name="amountCents" value={pair.amountCents} />
              <button
                type="submit"
                className="rounded-sm border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-emerald-500/60 hover:text-emerald-300"
              >
                settle {nameOf(pair.debtorId)} → {nameOf(pair.creditorId)} ·{" "}
                <span className="font-mono">{formatMoney(pair.amountCents)}</span>
              </button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
