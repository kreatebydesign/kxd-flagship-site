/**
 * POST — create proposal from builder
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { ProposalBuilderError } from "@/lib/proposal-builder/errors";
import { createProposal } from "@/lib/proposal-builder/services";
import type { ProposalTemplateKind } from "@/lib/proposal-builder/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: "Title is required." }, { status: 400 });
    }

    const record = await createProposal({
      title: body.title.trim(),
      leadId: body.leadId ? Number(body.leadId) : undefined,
      clientId: body.clientId ? Number(body.clientId) : undefined,
      templateKind: (body.templateKind as ProposalTemplateKind) || null,
      templateId: body.templateId ? Number(body.templateId) : undefined,
      document: body.document,
      proposalDate: body.proposalDate,
      expiresAt: body.expiresAt,
      internalOwner:
        body.internalOwner ||
        String((auth as { email?: string }).email ?? "operator"),
    });

    return NextResponse.json({
      success: true,
      id: record.id,
      proposalNumber: record.proposalNumber,
    });
  } catch (err) {
    if (err instanceof ProposalBuilderError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[KXD Proposal Builder] create failed:", err);
    return NextResponse.json({ success: false, error: "Failed to create proposal." }, { status: 500 });
  }
}
