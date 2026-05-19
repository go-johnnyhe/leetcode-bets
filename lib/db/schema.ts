import {
  bigserial,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  leetcodeUsername: text("leetcode_username").notNull().unique(),
  dailyTarget: integer("daily_target").notNull().default(2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyResults = pgTable(
  "daily_results",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    day: date("day").notNull(),
    problemsCount: integer("problems_count").notNull(),
    problemSlugs: text("problem_slugs").array().notNull(),
    missed: integer("missed").notNull(),
    source: text("source").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.day] }) }),
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    day: date("day").notNull(),
    debtorId: text("debtor_id")
      .notNull()
      .references(() => users.id),
    creditorId: text("creditor_id")
      .notNull()
      .references(() => users.id),
    amountCents: integer("amount_cents").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqDayPairReason: uniqueIndex("ledger_entries_uniq").on(
      t.day,
      t.debtorId,
      t.creditorId,
      t.reason,
    ),
  }),
);

export const settlements = pgTable("settlements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  debtorId: text("debtor_id")
    .notNull()
    .references(() => users.id),
  creditorId: text("creditor_id")
    .notNull()
    .references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  note: text("note"),
  settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type DailyResult = typeof dailyResults.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
