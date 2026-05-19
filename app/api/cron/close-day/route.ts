import { NextRequest, NextResponse } from "next/server";
import { closeDayHandler } from "@/lib/cron/close-day";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const dayParam = req.nextUrl.searchParams.get("day") ?? undefined;
  try {
    const result = await closeDayHandler({ day: dayParam });
    return NextResponse.json(result);
  } catch (err) {
    console.error("close-day failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
