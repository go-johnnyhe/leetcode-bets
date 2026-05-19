import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Load .env.local before importing the db client.
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Distinct problems solved per (user, day). `null` means the user wasn't in
// the group yet that day — no row, no ledger.
// Sourced from the original Google Sheet (May 9–18, 2026).
const DAILY: Array<Record<"day" | "HJH" | "HMA" | "LR", string | number | null>> = [
  { day: "2026-05-09", HJH: 2, HMA: 2, LR: null }, // LR joined May 11
  { day: "2026-05-10", HJH: 2, HMA: 2, LR: null },
  { day: "2026-05-11", HJH: 2, HMA: 2, LR: 2 },
  { day: "2026-05-12", HJH: 2, HMA: 2, LR: 2 },
  { day: "2026-05-13", HJH: 2, HMA: 2, LR: 2 },
  { day: "2026-05-14", HJH: 2, HMA: 3, LR: 2 }, // HMA: 100, 219, 252
  { day: "2026-05-15", HJH: 2, HMA: 2, LR: 2 },
  { day: "2026-05-16", HJH: 2, HMA: 0, LR: 2 }, // HMA missed both — settled in person
  { day: "2026-05-17", HJH: 2, HMA: 4, LR: 2 }, // HMA: 144, 206, 416, 1046 (catch-up)
  { day: "2026-05-18", HJH: 2, HMA: 2, LR: 2 },
];

// Already paid in person (HMA Venmo'd both $2 after missing May 16).
const PRELAUNCH_SETTLEMENTS = [
  {
    debtorId: "HMA",
    creditorId: "HJH",
    amountCents: 200,
    note: "Paid in person before launch (May 16 miss)",
  },
  {
    debtorId: "HMA",
    creditorId: "LR",
    amountCents: 200,
    note: "Paid in person before launch (May 16 miss)",
  },
];

const TARGET = 2;

type UserId = "HJH" | "HMA" | "LR";
const ALL_USERS: UserId[] = ["HJH", "HMA", "LR"];

async function main() {
  const { db } = await import("./client");
  const { dailyResults, ledgerEntries, settlements } = await import("./schema");

  const existing = await db.select().from(dailyResults).limit(1);
  if (existing.length > 0) {
    console.error(
      "Refusing to import: daily_results already has rows.\n" +
        "If you want to re-run, clear the tables first:\n" +
        "  TRUNCATE daily_results, ledger_entries, settlements RESTART IDENTITY;",
    );
    process.exit(1);
  }

  let dailyRows = 0;
  let ledgerRows = 0;

  for (const row of DAILY) {
    const day = String(row.day);
    const presentUsers = ALL_USERS.filter((u) => row[u] !== null);

    for (const userId of presentUsers) {
      const count = Number(row[userId]);
      const missed = Math.max(0, TARGET - count);

      await db.insert(dailyResults).values({
        userId,
        day,
        problemsCount: count,
        problemSlugs: [],
        missed,
        source: "imported",
      });
      dailyRows += 1;

      if (missed > 0) {
        const others = presentUsers.filter((u) => u !== userId);
        const entries = [];
        for (let i = 1; i <= missed; i++) {
          for (const creditorId of others) {
            entries.push({
              day,
              debtorId: userId,
              creditorId,
              amountCents: 100,
              reason: `missed_problem_${i}`,
            });
          }
        }
        if (entries.length > 0) {
          await db.insert(ledgerEntries).values(entries);
          ledgerRows += entries.length;
        }
      }
    }
    console.log(
      `  ${day}: ${presentUsers
        .map((u) => `${u}=${row[u]}`)
        .join(" ")}`,
    );
  }

  for (const s of PRELAUNCH_SETTLEMENTS) {
    await db.insert(settlements).values(s);
  }

  console.log(
    `\nimported ${dailyRows} daily_results, ${ledgerRows} ledger_entries, ${PRELAUNCH_SETTLEMENTS.length} settlements`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
