import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Load .env.local (Next.js convention) into process.env before importing the
// database client, which reads DATABASE_URL on first use.
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

// Edit leetcode_username values before running.
const PARTICIPANTS = [
  { id: "HJH", displayName: "Jiahui", leetcodeUsername: "lareinahu2023" },
  { id: "HMA", displayName: "Johnny", leetcodeUsername: "Dimentio233" },
  { id: "LR", displayName: "Lorri", leetcodeUsername: "RLuo23" },
];

async function main() {
  const { db } = await import("./client");
  const { users } = await import("./schema");
  for (const p of PARTICIPANTS) {
    await db.insert(users).values(p).onConflictDoNothing();
    console.log(`seeded user ${p.id} (${p.leetcodeUsername})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
