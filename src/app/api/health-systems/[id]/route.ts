import { NextResponse } from "next/server";
import { getHealthSystemById } from "@/lib/db/health-systems";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getHealthSystemById(id);
    if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ healthSystem: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load healthSystem." }, { status: 500 });
  }
}
