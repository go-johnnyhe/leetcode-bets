// One-off import: backfill problem_slugs for May 9-18 imported daily_results
// rows from the original Google Sheet. Does not touch counts, ledger, or
// settlements. Safe to re-run (idempotent UPDATE).

import { readFileSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}

// (user_id, YYYY-MM-DD, [frontend problem numbers]). Drawn from Johnny's
// original spreadsheet. Counts already in DB; we only write slugs.
const CELLS: Array<{ userId: string; day: string; numbers: number[] }> = [
  // HJH (Lareina)
  { userId: "HJH", day: "2026-05-09", numbers: [743, 1631] },
  { userId: "HJH", day: "2026-05-10", numbers: [1368, 1514] },
  { userId: "HJH", day: "2026-05-11", numbers: [886, 787] },
  { userId: "HJH", day: "2026-05-12", numbers: [785, 21] },
  { userId: "HJH", day: "2026-05-13", numbers: [1135, 1584] },
  { userId: "HJH", day: "2026-05-14", numbers: [37, 46] },
  { userId: "HJH", day: "2026-05-15", numbers: [51, 52] },
  { userId: "HJH", day: "2026-05-16", numbers: [77, 78] },
  { userId: "HJH", day: "2026-05-17", numbers: [40, 90] },
  { userId: "HJH", day: "2026-05-18", numbers: [39, 47] },
  // HMA (Johnny). 14 = 3 problems, 17 = 4 problems (bonus days). 16 = miss (no row needed).
  { userId: "HMA", day: "2026-05-09", numbers: [242, 374] },
  { userId: "HMA", day: "2026-05-10", numbers: [121, 344] },
  { userId: "HMA", day: "2026-05-11", numbers: [226, 225] },
  { userId: "HMA", day: "2026-05-12", numbers: [680, 703] },
  { userId: "HMA", day: "2026-05-13", numbers: [21, 104] },
  { userId: "HMA", day: "2026-05-14", numbers: [100, 219, 252] },
  { userId: "HMA", day: "2026-05-15", numbers: [88, 1929] },
  { userId: "HMA", day: "2026-05-17", numbers: [144, 206, 416, 1046] },
  { userId: "HMA", day: "2026-05-18", numbers: [208, 994] },
  // LR (Lorri). 9 and 10 omitted (no rows; she hadn't joined).
  { userId: "LR", day: "2026-05-11", numbers: [852, 778] },
  { userId: "LR", day: "2026-05-12", numbers: [88, 752] },
  { userId: "LR", day: "2026-05-13", numbers: [652, 1320] },
  { userId: "LR", day: "2026-05-14", numbers: [233, 882] },
  { userId: "LR", day: "2026-05-15", numbers: [955, 944] },
  { userId: "LR", day: "2026-05-16", numbers: [403, 1824] },
  { userId: "LR", day: "2026-05-17", numbers: [56, 139] },
  { userId: "LR", day: "2026-05-18", numbers: [705, 820] },
];

type Stat = {
  question__title: string;
  question__title_slug: string;
  frontend_question_id: number;
};
type Catalog = { stat_status_pairs: Array<{ stat: Stat }> };

async function main() {
  console.log("Fetching LeetCode catalog...");
  const res = await fetch("https://leetcode.com/api/problems/all/", {
    headers: { "User-Agent": "leetcode-bet/1.0 (accountability tracker)" },
  });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  const body = (await res.json()) as Catalog;

  const byNumber = new Map<number, { slug: string; title: string }>();
  for (const p of body.stat_status_pairs) {
    byNumber.set(p.stat.frontend_question_id, {
      slug: p.stat.question__title_slug,
      title: p.stat.question__title,
    });
  }
  console.log(`Loaded ${byNumber.size} problems.\n`);

  // Validate every cell resolves.
  const missing: Array<{ userId: string; day: string; number: number }> = [];
  for (const c of CELLS) {
    for (const n of c.numbers) {
      if (!byNumber.has(n)) missing.push({ userId: c.userId, day: c.day, number: n });
    }
  }
  if (missing.length > 0) {
    console.error("UNRESOLVED problem numbers — aborting:");
    for (const m of missing) console.error(`  ${m.userId} ${m.day}: #${m.number}`);
    process.exit(1);
  }

  // Print the plan.
  console.log("Resolved mapping:\n");
  for (const c of CELLS) {
    const slugs = c.numbers.map((n) => byNumber.get(n)!);
    const titles = slugs.map((s, i) => `#${c.numbers[i]} ${s.title}`).join(", ");
    console.log(`  ${c.userId} ${c.day}: ${titles}`);
  }
  console.log();

  // Execute UPDATEs.
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  let updated = 0;
  for (const c of CELLS) {
    const slugs = c.numbers.map((n) => byNumber.get(n)!.slug);
    const r = await sql`
      update daily_results
      set problem_slugs = ${slugs}::text[]
      where user_id = ${c.userId} and day = ${c.day} and source = 'imported'
      returning user_id, day
    `;
    if (r.length === 0) {
      console.warn(`  no row matched for ${c.userId} ${c.day} (skipped)`);
    } else {
      updated += 1;
    }
  }
  console.log(`\nUpdated ${updated} / ${CELLS.length} rows.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
