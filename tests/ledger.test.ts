import { describe, expect, it } from "vitest";
import { computeLedgerEntries, netBalance } from "@/lib/ledger/compute";

describe("computeLedgerEntries", () => {
  const day = "2026-05-18";
  const others = ["HJH", "LR"] as const;

  it("returns no entries when nothing was missed", () => {
    expect(computeLedgerEntries(day, "HMA", others, 0)).toEqual([]);
  });

  it("writes 2 entries totalling $2 when 1 problem missed", () => {
    const entries = computeLedgerEntries(day, "HMA", others, 1);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.amountCents === 100)).toBe(true);
    expect(entries.map((e) => e.creditorId).sort()).toEqual(["HJH", "LR"]);
    expect(entries.every((e) => e.debtorId === "HMA" && e.day === day)).toBe(true);
  });

  it("writes 4 entries totalling $4 when 2 problems missed", () => {
    const entries = computeLedgerEntries(day, "HMA", others, 2);
    expect(entries).toHaveLength(4);
    const total = entries.reduce((s, e) => s + e.amountCents, 0);
    expect(total).toBe(400);
    expect(entries.filter((e) => e.creditorId === "HJH")).toHaveLength(2);
    expect(entries.filter((e) => e.creditorId === "LR")).toHaveLength(2);
  });

  it("tags each entry with its missed-problem index", () => {
    const entries = computeLedgerEntries(day, "HMA", others, 2);
    const reasons = entries.map((e) => e.reason).sort();
    expect(reasons).toEqual([
      "missed_problem_1",
      "missed_problem_1",
      "missed_problem_2",
      "missed_problem_2",
    ]);
  });
});

describe("netBalance", () => {
  it("returns 0 when there are no entries", () => {
    expect(netBalance([], [], "HMA", "HJH")).toBe(0);
  });

  it("sums ledger entries for the ordered pair", () => {
    const ledger = [
      { debtorId: "HMA", creditorId: "HJH", amountCents: 100 },
      { debtorId: "HMA", creditorId: "HJH", amountCents: 100 },
      { debtorId: "HMA", creditorId: "LR", amountCents: 100 },
    ];
    expect(netBalance(ledger, [], "HMA", "HJH")).toBe(200);
    expect(netBalance(ledger, [], "HMA", "LR")).toBe(100);
    expect(netBalance(ledger, [], "HJH", "HMA")).toBe(0);
  });

  it("subtracts settlements", () => {
    const ledger = [
      { debtorId: "HMA", creditorId: "HJH", amountCents: 400 },
    ];
    const settlements = [
      { debtorId: "HMA", creditorId: "HJH", amountCents: 200 },
    ];
    expect(netBalance(ledger, settlements, "HMA", "HJH")).toBe(200);
  });

  it("ignores entries for other pairs", () => {
    const ledger = [{ debtorId: "LR", creditorId: "HJH", amountCents: 100 }];
    expect(netBalance(ledger, [], "HMA", "HJH")).toBe(0);
  });
});
