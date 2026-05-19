import type { AcSubmission } from "./submissions";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

const QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }
`;

type RawSubmission = {
  id: string;
  title: string;
  titleSlug: string;
  /** LeetCode returns the timestamp as a stringified unix second value. */
  timestamp: string;
};

export class LeetCodeFetchError extends Error {
  constructor(
    message: string,
    public readonly username: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LeetCodeFetchError";
  }
}

export type FetchOptions = {
  limit?: number;
  retries?: number;
  /** Override fetch (for tests). */
  fetchImpl?: typeof fetch;
  /** Base backoff in ms; doubles each retry. */
  backoffMs?: number;
};

export async function fetchRecentAcSubmissions(
  username: string,
  opts: FetchOptions = {},
): Promise<AcSubmission[]> {
  const limit = opts.limit ?? 20;
  const retries = opts.retries ?? 3;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const backoffMs = opts.backoffMs ?? 500;

  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      await sleep(backoffMs * 2 ** (attempt - 1));
    }
    try {
      const res = await fetchImpl(LEETCODE_GRAPHQL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "leetcode-bet/1.0 (accountability tracker)",
        },
        body: JSON.stringify({
          query: QUERY,
          variables: { username, limit },
        }),
      });

      if (!res.ok) {
        if (res.status >= 500 || res.status === 429) {
          lastErr = new Error(`LeetCode responded ${res.status}`);
          continue;
        }
        throw new LeetCodeFetchError(
          `LeetCode responded ${res.status} for ${username}`,
          username,
        );
      }

      const body = (await res.json()) as {
        data?: { recentAcSubmissionList?: RawSubmission[] };
        errors?: unknown;
      };
      if (body.errors) {
        throw new LeetCodeFetchError(
          `LeetCode GraphQL errors for ${username}: ${JSON.stringify(body.errors)}`,
          username,
        );
      }
      const raw = body.data?.recentAcSubmissionList ?? [];
      return raw.map((s) => ({
        id: s.id,
        title: s.title,
        titleSlug: s.titleSlug,
        timestamp: Number.parseInt(s.timestamp, 10),
      }));
    } catch (err) {
      // Non-retryable LeetCodeFetchError shouldn't be retried.
      if (err instanceof LeetCodeFetchError) throw err;
      lastErr = err;
    }
  }
  throw new LeetCodeFetchError(
    `Failed to fetch ${username} after ${retries} attempts`,
    username,
    lastErr,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
