/**
 * GET — proposal detail
 * PATCH — save draft
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { ProposalBuilderError } from "@/lib/proposal-builder/errors";
import { calculateProposalTotals } from "@/lib/proposal-builder/pricing";
import { normalizeProposalDocument } from "@/lib/proposal-builder/document";
import {
  getContractForProposal,
  getProposal,
  operatorShareStateFromProposal,
  previewCanonical,
  saveProposalDraft,
} from "@/lib/proposal-builder/services";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
  }

  const proposal = await getProposal(id);
  if (!proposal) {
    return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
  }

  const document = normalizeProposalDocument(proposal.builderDocument);
  const totals = calculateProposalTotals(document);
  const canonical = previewCanonical(proposal);
  const contract = await getContractForProposal(id);

  return NextResponse.json({
    success: true,
    proposal,
    document,
    totals,
    canonical,
    contract,
    shareState: operatorShareStateFromProposal(proposal),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
  }

  try {
    const body = await req.json();
    if (!body.document) {
      return NextResponse.json({ success: false, error: "document is required." }, { status: 400 });
    }

    const proposal = await saveProposalDraft(id, {
      title: body.title,
      leadId: body.leadId !== undefined ? (body.leadId ? Number(body.leadId) : null) : undefined,
      clientId:
        body.clientId !== undefined ? (body.clientId ? Number(body.clientId) : null) : undefined,
      proposalDate: body.proposalDate,
      expiresAt: body.expiresAt,
      internalOwner: body.internalOwner,
      scheduleCallUrl: body.scheduleCallUrl,
      document: body.document,
      bumpVersion: Boolean(body.bumpVersion),
      versionNotes: body.versionNotes,
      actor: String((auth as { email?: string }).email ?? "operator"),
    });

    const document = normalizeProposalDocument(proposal.builderDocument);
    const totals = calculateProposalTotals(document);

    return NextResponse.json({ success: true, id: proposal.id, proposal, totals });
  } catch (err) {
    if (err instanceof ProposalBuilderError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[KXD Proposal Builder] save failed:", err);
    return NextResponse.json({ success: false, error: "Failed to save proposal." }, { status: 500 });
  }
}
