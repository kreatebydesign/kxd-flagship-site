import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { convertApprovedProposal } from "@/lib/proposal-conversion/engine";
import type { ConversionMode } from "@/lib/proposal-conversion/types";
import type { ConversionWizardDraft } from "@/lib/sales/acquisition";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { proposalId } = await params;
  const body = await req.json().catch(() => ({}));
  const conversionMode = body.conversionMode as ConversionMode | undefined;
  const existingClientId =
    body.existingClientId != null ? Number(body.existingClientId) : undefined;
  const wizardDraft = body.draft as ConversionWizardDraft | undefined;

  const result = await convertApprovedProposal({
    proposalId: Number(proposalId),
    conversionMode,
    existingClientId,
    wizardDraft,
  });

  if (!result.success) {
    return NextResponse.json({ success: false, errors: result.errors }, { status: 400 });
  }

  return NextResponse.json({ success: true, result });
}
