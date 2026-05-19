import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "drizzle-kit";

// drizzle-kit doesn't load .env.local automatically (only Next.js does),
// so pull it in by hand before reading DATABASE_URL.
loadDotEnv(".env.local");
loadDotEnv(".env");

function loadDotEnv(name: string) {
  const path = join(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Put it in .env.local (see .env.example).",
  );
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
