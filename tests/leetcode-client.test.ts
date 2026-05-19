import { describe, expect, it, vi } from "vitest";
import {
  fetchRecentAcSubmissions,
  LeetCodeFetchError,
} from "@/lib/leetcode/client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchRecentAcSubmissions", () => {
  it("parses successful responses into AcSubmission objects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          recentAcSubmissionList: [
            { id: "1", title: "Two Sum", titleSlug: "two-sum", timestamp: "1747627200" },
            { id: "2", title: "3Sum", titleSlug: "3sum", timestamp: "1747630800" },
          ],
        },
      }),
    );
    const out = await fetchRecentAcSubmissions("alice", { fetchImpl, backoffMs: 1 });
    expect(out).toEqual([
      { id: "1", title: "Two Sum", titleSlug: "two-sum", timestamp: 1747627200 },
      { id: "2", title: "3Sum", titleSlug: "3sum", timestamp: 1747630800 },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and eventually succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("oops", { status: 502 }))
      .mockResolvedValueOnce(new Response("oops", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ data: { recentAcSubmissionList: [] } }));
    const out = await fetchRecentAcSubmissions("alice", { fetchImpl, backoffMs: 1 });
    expect(out).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws after all retries fail", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("oops", { status: 502 }));
    await expect(
      fetchRecentAcSubmissions("alice", { fetchImpl, backoffMs: 1, retries: 3 }),
    ).rejects.toBeInstanceOf(LeetCodeFetchError);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 4xx (other than 429)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("nope", { status: 404 }));
    await expect(
      fetchRecentAcSubmissions("alice", { fetchImpl, backoffMs: 1 }),
    ).rejects.toBeInstanceOf(LeetCodeFetchError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("surfaces GraphQL errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ errors: [{ message: "user not found" }] }),
    );
    await expect(
      fetchRecentAcSubmissions("ghost", { fetchImpl, backoffMs: 1 }),
    ).rejects.toBeInstanceOf(LeetCodeFetchError);
  });
});
