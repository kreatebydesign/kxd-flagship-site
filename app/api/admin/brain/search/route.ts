import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { executiveBrainSearch } from "@/lib/brain/search";
import { loadIntelligenceContext } from "@/lib/intelligence/context";
import { recordBrainMemory } from "@/lib/brain/memory";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ success: true, results: [] });
  }
  const ctx = await loadIntelligenceContext();
  const results = await executiveBrainSearch(q, ctx);
  return NextResponse.json({ success: true, results });
}

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as {
      recommendationId: string;
      action: "dismissed" | "completed" | "ignored";
      clientId?: number;
      title?: string;
    };
    if (!body.recommendationId || !body.action) {
      return NextResponse.json({ success: false, error: "Invalid payload." }, { status: 400 });
    }
    await recordBrainMemory(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record memory.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
