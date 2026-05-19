export function formatMoney(cents: number): string {
  if (cents === 0) return "$0";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function timeAgo(unixSec: number, nowMs = Date.now()): string {
  const diffSec = Math.max(0, Math.floor(nowMs / 1000) - unixSec);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

const TITLE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});

export function formatShortDate(day: string): string {
  // day is 'YYYY-MM-DD' in PT calendar.
  const [y, m, d] = day.split("-").map((n) => Number.parseInt(n, 10));
  return TITLE_FORMATTER.format(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)));
}

export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) =>
      /^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}
