import { NextResponse } from "next/server";
import { buildBrain, clearBrainCache } from "@/lib/brain";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await buildBrain();
  return NextResponse.json({ success: true, snapshot });
}

export async function POST() {
  clearBrainCache();
  const snapshot = await buildBrain();
  return NextResponse.json({ success: true, snapshot });
}
