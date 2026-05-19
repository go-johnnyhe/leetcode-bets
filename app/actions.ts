"use server";

import { revalidatePath } from "next/cache";
import { insertSettlement } from "@/lib/db/queries";

export async function settleAction(formData: FormData) {
  const debtorId = String(formData.get("debtorId") ?? "");
  const creditorId = String(formData.get("creditorId") ?? "");
  const amountCents = Number(formData.get("amountCents") ?? 0);
  const note = formData.get("note") ? String(formData.get("note")) : undefined;

  if (!debtorId || !creditorId || debtorId === creditorId || amountCents <= 0) {
    throw new Error("invalid settlement");
  }
  await insertSettlement(debtorId, creditorId, amountCents, note);
  revalidatePath("/");
}
