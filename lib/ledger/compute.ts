export type LedgerEntryInsert = {
  day: string;
  debtorId: string;
  creditorId: string;
  amountCents: number;
  reason: string;
};

export type LedgerRow = {
  debtorId: string;
  creditorId: string;
  amountCents: number;
};

export type SettlementRow = {
  debtorId: string;
  creditorId: string;
  amountCents: number;
};

/**
 * For a user who missed `missed` problems on `day`, produce one $1 ledger
 * entry for each (missed problem × each other user).
 */
export function computeLedgerEntries(
  day: string,
  debtorId: string,
  otherUserIds: readonly string[],
  missed: number,
): LedgerEntryInsert[] {
  if (missed <= 0) return [];
  const out: LedgerEntryInsert[] = [];
  for (let i = 1; i <= missed; i++) {
    for (const creditorId of otherUserIds) {
      out.push({
        day,
        debtorId,
        creditorId,
        amountCents: 100,
        reason: `missed_problem_${i}`,
      });
    }
  }
  return out;
}

/**
 * Net cents owed from `fromId` → `toId`: sum of ledger entries minus
 * sum of settlements for that ordered pair. Negative means `toId` owes `fromId`
 * after over-settlement (shouldn't normally happen).
 */
export function netBalance(
  ledger: readonly LedgerRow[],
  settlements: readonly SettlementRow[],
  fromId: string,
  toId: string,
): number {
  let owed = 0;
  for (const e of ledger) {
    if (e.debtorId === fromId && e.creditorId === toId) owed += e.amountCents;
  }
  let settled = 0;
  for (const s of settlements) {
    if (s.debtorId === fromId && s.creditorId === toId) settled += s.amountCents;
  }
  return owed - settled;
}
