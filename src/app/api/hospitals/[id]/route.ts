import { NextResponse } from "next/server";
import { getHospitalById } from "@/lib/db/hospitals";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getHospitalById(id);
    if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ hospital: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load hospital." }, { status: 500 });
  }
}
