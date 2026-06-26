import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getProposalByPublicToken } from "@/lib/sales/public";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await params;
  const view = await getProposalByPublicToken(publicToken);
  if (!view) {
    return NextResponse.json({ success: false, error: "Proposal not found or link expired." }, { status: 404 });
  }
  return NextResponse.json({ success: true, ...view });
}
