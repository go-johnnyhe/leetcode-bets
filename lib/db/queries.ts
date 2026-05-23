import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./client";
import {
  dailyResults,
  ledgerEntries,
  settlements,
  users,
  type User,
} from "./schema";

export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(users.id);
}

export async function getUserByLeetcodeUsername(
  username: string,
): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.leetcodeUsername, username))
    .limit(1);
  return rows[0] ?? null;
}

export type UserProblemDay = {
  day: string;
  problemsCount: number;
  problemSlugs: string[];
  target: number;
  source: string;
};

export async function getUserProblemHistory(
  userId: string,
): Promise<UserProblemDay[]> {
  const rows = await db
    .select({
      day: dailyResults.day,
      problemsCount: dailyResults.problemsCount,
      problemSlugs: dailyResults.problemSlugs,
      source: dailyResults.source,
      target: users.dailyTarget,
    })
    .from(dailyResults)
    .innerJoin(users, eq(users.id, dailyResults.userId))
    .where(
      and(
        eq(dailyResults.userId, userId),
        sql`${dailyResults.source} <> 'pending_fetch'`,
      ),
    )
    .orderBy(desc(dailyResults.day));
  return rows.map((r) => ({
    day: String(r.day),
    problemsCount: r.problemsCount,
    problemSlugs: r.problemSlugs,
    target: r.target,
    source: r.source,
  }));
}

export type BalanceCell = {
  debtorId: string;
  creditorId: string;
  amountCents: number;
};

export async function getBalanceMatrix(): Promise<BalanceCell[]> {
  const ledgerTotals = await db
    .select({
      debtorId: ledgerEntries.debtorId,
      creditorId: ledgerEntries.creditorId,
      total: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)`.as("total"),
    })
    .from(ledgerEntries)
    .groupBy(ledgerEntries.debtorId, ledgerEntries.creditorId);

  const settlementTotals = await db
    .select({
      debtorId: settlements.debtorId,
      creditorId: settlements.creditorId,
      total: sql<number>`coalesce(sum(${settlements.amountCents}), 0)`.as("total"),
    })
    .from(settlements)
    .groupBy(settlements.debtorId, settlements.creditorId);

  const key = (d: string, c: string) => `${d}|${c}`;
  const settledMap = new Map<string, number>();
  for (const s of settlementTotals) {
    settledMap.set(key(s.debtorId, s.creditorId), Number(s.total));
  }

  const out: BalanceCell[] = [];
  for (const row of ledgerTotals) {
    const settled = settledMap.get(key(row.debtorId, row.creditorId)) ?? 0;
    const net = Number(row.total) - settled;
    out.push({
      debtorId: row.debtorId,
      creditorId: row.creditorId,
      amountCents: Math.max(0, net),
    });
  }
  return out;
}

export type HeroStats = {
  totalProblems: number;
  totalCentsFlowed: number;
  daysRunning: number;
  /** Earliest day with any daily_results row, 'YYYY-MM-DD' in PT — null if none. */
  earliestDay: string | null;
};

export async function getHeroStats(): Promise<HeroStats> {
  const [problemsRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${dailyResults.problemsCount}), 0)`,
    })
    .from(dailyResults)
    .where(sql`${dailyResults.source} <> 'pending_fetch' AND ${dailyResults.problemsCount} > 0`);

  const [flowRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)`,
    })
    .from(ledgerEntries);

  const [dateRow] = await db
    .select({
      earliest: sql<string | null>`min(${dailyResults.day})`,
    })
    .from(dailyResults);

  const earliest = dateRow?.earliest;
  const daysRunning = earliest
    ? Math.max(1, Math.floor((Date.now() - new Date(`${earliest}T12:00:00Z`).getTime()) / 86_400_000) + 1)
    : 0;

  return {
    totalProblems: Number(problemsRow?.total ?? 0),
    totalCentsFlowed: Number(flowRow?.total ?? 0),
    daysRunning,
    earliestDay: earliest ? String(earliest) : null,
  };
}

export type HeatmapCell = {
  userId: string;
  day: string;
  problemsCount: number;
  target: number;
  source: string;
};

export async function getHeatmapData(
  daysBack: number,
  userId?: string,
): Promise<HeatmapCell[]> {
  const cutoff = sql<string>`(current_date - ${daysBack}::int)`;
  const whereClause = userId
    ? and(gte(dailyResults.day, cutoff), eq(dailyResults.userId, userId))
    : gte(dailyResults.day, cutoff);
  const rows = await db
    .select({
      userId: dailyResults.userId,
      day: dailyResults.day,
      problemsCount: dailyResults.problemsCount,
      source: dailyResults.source,
      target: users.dailyTarget,
    })
    .from(dailyResults)
    .innerJoin(users, eq(users.id, dailyResults.userId))
    .where(whereClause);

  return rows.map((r) => ({
    userId: r.userId,
    day: String(r.day),
    problemsCount: r.problemsCount,
    target: r.target,
    source: r.source,
  }));
}

export async function getStreakData(): Promise<
  Array<{ userId: string; day: string; problemsCount: number; target: number; source: string }>
> {
  // Return all rows. At a few rows per day for 3 users this is tiny.
  const rows = await db
    .select({
      userId: dailyResults.userId,
      day: dailyResults.day,
      problemsCount: dailyResults.problemsCount,
      source: dailyResults.source,
      target: users.dailyTarget,
    })
    .from(dailyResults)
    .innerJoin(users, eq(users.id, dailyResults.userId));
  return rows.map((r) => ({
    userId: r.userId,
    day: String(r.day),
    problemsCount: r.problemsCount,
    target: r.target,
    source: r.source,
  }));
}

export type LedgerEvent =
  | {
      kind: "miss";
      day: string;
      debtorId: string;
      missedCount: number;
      perCreditorCents: number;
      creditors: string[];
    }
  | {
      kind: "settlement";
      day: string; // date the settlement was recorded (PT)
      settledAt: Date;
      debtorId: string;
      creditorId: string;
      amountCents: number;
      note: string | null;
    };

export type LedgerLog = {
  /** Range covered, inclusive: 'YYYY-MM-DD'. */
  fromDay: string;
  toDay: string;
  events: LedgerEvent[];
};

export async function getLedgerLog(daysBack: number): Promise<LedgerLog> {
  const cutoff = sql<string>`(current_date - ${daysBack}::int)`;

  const ledger = await db
    .select({
      day: ledgerEntries.day,
      debtorId: ledgerEntries.debtorId,
      creditorId: ledgerEntries.creditorId,
      amountCents: ledgerEntries.amountCents,
    })
    .from(ledgerEntries)
    .where(gte(ledgerEntries.day, cutoff))
    .orderBy(desc(ledgerEntries.day));

  const settlementsRows = await db
    .select({
      debtorId: settlements.debtorId,
      creditorId: settlements.creditorId,
      amountCents: settlements.amountCents,
      note: settlements.note,
      settledAt: settlements.settledAt,
    })
    .from(settlements)
    .orderBy(desc(settlements.settledAt));

  // Group ledger entries by (day, debtor) into miss events.
  const missMap = new Map<
    string,
    { day: string; debtorId: string; perCreditor: Map<string, number> }
  >();
  for (const row of ledger) {
    const day = String(row.day);
    const key = `${day}|${row.debtorId}`;
    if (!missMap.has(key)) {
      missMap.set(key, { day, debtorId: row.debtorId, perCreditor: new Map() });
    }
    const m = missMap.get(key)!;
    m.perCreditor.set(
      row.creditorId,
      (m.perCreditor.get(row.creditorId) ?? 0) + row.amountCents,
    );
  }

  const events: LedgerEvent[] = [];
  for (const m of missMap.values()) {
    const perCreditorCents = Array.from(m.perCreditor.values())[0] ?? 0;
    const missedCount = perCreditorCents / 100;
    events.push({
      kind: "miss",
      day: m.day,
      debtorId: m.debtorId,
      missedCount,
      perCreditorCents,
      creditors: Array.from(m.perCreditor.keys()).sort(),
    });
  }
  for (const s of settlementsRows) {
    const settledAt = s.settledAt;
    const day = formatPtDate(settledAt);
    events.push({
      kind: "settlement",
      day,
      settledAt,
      debtorId: s.debtorId,
      creditorId: s.creditorId,
      amountCents: s.amountCents,
      note: s.note,
    });
  }

  events.sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? 1 : -1;
    // Within a day, settlements after misses.
    if (a.kind !== b.kind) return a.kind === "miss" ? -1 : 1;
    return 0;
  });

  return {
    fromDay: events.length ? events[events.length - 1].day : "",
    toDay: events.length ? events[0].day : "",
    events,
  };
}

function formatPtDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getDailyResultsForDay(day: string) {
  return db.select().from(dailyResults).where(eq(dailyResults.day, day));
}

export async function insertSettlement(
  debtorId: string,
  creditorId: string,
  amountCents: number,
  note?: string,
) {
  return db.insert(settlements).values({
    debtorId,
    creditorId,
    amountCents,
    note: note ?? null,
  });
}

export async function getPendingFetchResults(day: string) {
  return db
    .select()
    .from(dailyResults)
    .where(and(eq(dailyResults.day, day), eq(dailyResults.source, "pending_fetch")));
}
