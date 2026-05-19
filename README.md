# leetcode-bet

Daily LeetCode accountability dashboard for HJH, HMA, and LR.

- Each person owes $1 per missed problem **per other person** (target: 2/day, deadline: 11:59 PM PT).
- A nightly cron job reads each person's public LeetCode submissions, counts distinct problems solved that day, and writes ledger entries for whoever fell short.
- The dashboard shows today's live progress, the running balance matrix, the last 14 days of history, and a "settle up" button per pair.

## Stack

- Next.js 15 (App Router, TypeScript) on Vercel
- Neon serverless Postgres + Drizzle ORM
- Vercel Cron at 07:05 UTC (00:05 PT) and 07:35 UTC for pending-fetch retries
- Vitest for unit tests

## Local setup

```bash
npm install
cp .env.example .env.local        # then fill in DATABASE_URL and CRON_SECRET
```

### One-time database setup

1. Create a free Neon project at https://neon.tech. Copy the **pooled** connection string into `DATABASE_URL` in `.env.local`.
2. Push the schema:
   ```bash
   npm run db:push
   ```
3. Edit `lib/db/seed.ts` and replace `*-leetcode-username` placeholders with the real LeetCode usernames for HJH, HMA, LR. Then:
   ```bash
   npm run db:seed
   ```

### Run the app

```bash
npm run dev     # http://localhost:3000
```

### Run the tests

```bash
npm test
```

### Smoke-test the cron locally

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/close-day?day=2026-05-18"
```

The handler is idempotent — running it twice for the same day is a no-op.
If a user's LeetCode fetch fails, they're recorded with `source=pending_fetch`
and the next invocation retries them.

## Deploy to Vercel

```bash
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add CRON_SECRET production
npx vercel --prod
```

Vercel injects `CRON_SECRET` into the cron requests' `Authorization: Bearer …`
header automatically. The `vercel.json` schedule fires twice each PT-midnight
to cover transient LeetCode failures.

## Project layout

```
app/
├── layout.tsx                       app shell + Tailwind
├── page.tsx                         dashboard (server component)
├── actions.ts                       "settle" server action
└── api/cron/close-day/route.ts      daily job

lib/
├── db/
│   ├── schema.ts                    Drizzle tables
│   ├── client.ts                    lazy Neon client
│   ├── queries.ts                   dashboard reads + insertSettlement
│   └── seed.ts                      one-time user seed
├── leetcode/
│   ├── client.ts                    GraphQL fetch + retry
│   ├── submissions.ts               pure: AC list → daily result
│   └── today.ts                     live "today" view
├── ledger/
│   └── compute.ts                   pure: daily result → ledger entries
└── cron/
    └── close-day.ts                 idempotent close-day orchestrator

tests/                               vitest unit tests
drizzle/                             generated migrations (gitignored output)
vercel.json                          cron schedule
```

## Rules, summarized

| Solves that day | $$ to each other person | $$ total |
|-----------------|-------------------------|----------|
| 2+              | $0                      | $0       |
| 1               | $1                      | $2       |
| 0               | $2                      | $4       |

Ledger is append-only; settling inserts a new row, never deletes ledger
entries. If you ever misclick "settle," counter-correct with another
settlement of the opposite direction.
