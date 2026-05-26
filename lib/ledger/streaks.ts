export type DailyResultLite = {
  day: string; // 'YYYY-MM-DD'
  problemsCount: number;
  target: number;
  source: string;
};

export type StreakInput = {
  /** All daily_results rows for one user. Any order. */
  results: DailyResultLite[];
  /** Today's PT date as 'YYYY-MM-DD'. */
  today: string;
  /** Live: has the user hit target today (regardless of DB state)? */
  todayMet: boolean;
};

export type StreakResult = { current: number; longest: number };

const DAY_MS = 86_400_000;

/** Add (or subtract) days from a YYYY-MM-DD string. Anchors at UTC noon so DST never shifts the result. */
export function shiftDay(day: string, deltaDays: number): string {
  const [y, m, d] = day.split("-").map((n) => Number.parseInt(n, 10));
  const t = Date.UTC(y, m - 1, d, 12, 0, 0) + deltaDays * DAY_MS;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Monday-of-week for a 'YYYY-MM-DD' day, Monday-based. Sunday rolls back six days. */
export function mondayOfWeek(day: string): string {
  const [y, m, d] = day.split("-").map((n) => Number.parseInt(n, 10));
  const t = Date.UTC(y, m - 1, d, 12, 0, 0);
  const dow = new Date(t).getUTCDay(); // 0=Sun ... 6=Sat
  const back = dow === 0 ? 6 : dow - 1;
  return shiftDay(day, -back);
}

function passes(r: DailyResultLite): boolean {
  return r.source !== "pending_fetch" && r.problemsCount >= r.target;
}

export function computeStreak(input: StreakInput): StreakResult {
  const byDay = new Map<string, DailyResultLite>();
  for (const r of input.results) byDay.set(r.day, r);
  const sortedDays = Array.from(byDay.keys()).sort();
  const earliest = sortedDays[0] ?? input.today;

  // Current streak — walk back from today.
  let current = 0;
  let cursor = input.today;
  if (input.todayMet) {
    current = 1;
    cursor = shiftDay(cursor, -1);
  } else {
    // If today isn't met yet, the streak is everything up to yesterday.
    cursor = shiftDay(cursor, -1);
  }
  while (cursor >= earliest) {
    const row = byDay.get(cursor);
    if (!row || !passes(row)) break;
    current += 1;
    cursor = shiftDay(cursor, -1);
  }

  // Longest streak — scan all rows + a "virtual today" if met.
  let longest = current;
  if (sortedDays.length > 0) {
    let run = 0;
    let prev: string | null = null;
    for (const day of sortedDays) {
      const row = byDay.get(day)!;
      const ok = passes(row);
      const contiguous = prev === null || shiftDay(prev, 1) === day;
      if (ok && contiguous) {
        run += 1;
      } else if (ok) {
        run = 1;
      } else {
        run = 0;
      }
      if (run > longest) longest = run;
      prev = day;
    }
    // If today met but no row yet, today extends the trailing run.
    if (input.todayMet && !byDay.has(input.today)) {
      const yesterday = shiftDay(input.today, -1);
      const last = sortedDays[sortedDays.length - 1];
      if (last === yesterday) {
        // run currently equals length of the trailing run; +1 for today
        // but we may have already counted today in `current`. Recompute longest from current.
        if (current > longest) longest = current;
      } else if (current > longest) {
        longest = current;
      }
    }
  }

  return { current, longest };
}
