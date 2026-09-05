import { NextResponse } from "next/server";
import { getAllHealthSystems } from "@/lib/db/health-systems";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    const data = await getAllHealthSystems();
    return NextResponse.json({ healthSystems: data, count: data.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load health-systems." }, { status: 500 });
  }
}
