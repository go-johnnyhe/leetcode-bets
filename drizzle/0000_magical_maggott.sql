CREATE TABLE IF NOT EXISTS "daily_results" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"problems_count" integer NOT NULL,
	"problem_slugs" text[] NOT NULL,
	"missed" integer NOT NULL,
	"source" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_results_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"debtor_id" text NOT NULL,
	"creditor_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settlements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"debtor_id" text NOT NULL,
	"creditor_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"note" text,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"leetcode_username" text NOT NULL,
	"daily_target" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_leetcode_username_unique" UNIQUE("leetcode_username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_results" ADD CONSTRAINT "daily_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_debtor_id_users_id_fk" FOREIGN KEY ("debtor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_creditor_id_users_id_fk" FOREIGN KEY ("creditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settlements" ADD CONSTRAINT "settlements_debtor_id_users_id_fk" FOREIGN KEY ("debtor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settlements" ADD CONSTRAINT "settlements_creditor_id_users_id_fk" FOREIGN KEY ("creditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ledger_entries_uniq" ON "ledger_entries" USING btree ("day","debtor_id","creditor_id","reason");