import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { syncProposalPricing } from "@/lib/executive-proposals/sync-pricing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as { proposalId?: number };
    if (!body.proposalId) {
      return NextResponse.json(
        { success: false, error: "proposalId is required." },
        { status: 400 },
      );
    }
    await syncProposalPricing(body.proposalId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pricing sync failed.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
