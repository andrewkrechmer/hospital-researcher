import { NextResponse } from "next/server";
import { getAllHospitals } from "@/lib/db/hospitals";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    const data = await getAllHospitals();
    return NextResponse.json({ hospitals: data, count: data.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load hospitals." }, { status: 500 });
  }
}
