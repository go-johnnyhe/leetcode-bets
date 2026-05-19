import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export { schema };

type DB = NeonHttpDatabase<typeof schema>;

let _db: DB | null = null;

function init(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);
  return drizzle(sql, { schema });
}

/**
 * Proxy that lazy-initializes Drizzle on first method access. Importing this
 * module doesn't touch process.env, which keeps unit tests of dependent
 * modules importable without a database.
 */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    if (!_db) _db = init();
    const value = Reflect.get(_db, prop, receiver);
    return typeof value === "function" ? value.bind(_db) : value;
  },
});
