/**
 * POST — approve for sharing / create share link
 * DELETE — revoke share
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { ProposalBuilderError } from "@/lib/proposal-builder/errors";
import {
  approveProposalForSharing,
  markProposalShared,
  revokeShareLink,
} from "@/lib/proposal-builder/services";

export const dynamic = "force-dynamic";

export async function POST(
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
    const body = await req.json().catch(() => ({}));
    const result = await approveProposalForSharing(id, {
      actor: String((auth as { email?: string }).email ?? "operator"),
      expiresAt: body.expiresAt ?? null,
      notes: body.notes,
    });

    if (body.markShared) {
      await markProposalShared(id);
    }

    return NextResponse.json({
      success: true,
      shareUrlPath: result.shareUrlPath,
      rawToken: result.rawToken,
      proposalId: result.proposal.id,
      status: result.proposal.status,
    });
  } catch (err) {
    if (err instanceof ProposalBuilderError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[KXD Proposal Builder] share failed:", err);
    return NextResponse.json({ success: false, error: "Failed to approve share." }, { status: 500 });
  }
}

export async function DELETE(
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
    const body = await req.json().catch(() => ({}));
    const proposal = await revokeShareLink(id, body.shareLinkId);
    return NextResponse.json({ success: true, status: proposal.status, revoked: true });
  } catch (err) {
    if (err instanceof ProposalBuilderError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: "Failed to revoke share." }, { status: 500 });
  }
}
