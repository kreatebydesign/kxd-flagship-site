/**
 * POST — operator share actions: approve | prepare | replace | mark-sent
 * DELETE — revoke share (protected live deals blocked)
 *
 * Copy and Open are client-side only and never hit this route.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { ProposalBuilderError } from "@/lib/proposal-builder/errors";
import {
  approveProposalForSharing,
  markProposalDelivered,
  operatorShareStateFromProposal,
  prepareProposalShareLink,
  replaceProposalShareLink,
  revokeShareLink,
} from "@/lib/proposal-builder/services";
import { isProposalDeliveryMethod } from "@/lib/proposal-builder/share-workflow";

export const dynamic = "force-dynamic";

function actorEmail(auth: unknown): string {
  return String((auth as { email?: string }).email ?? "operator");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  if (!id || !Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const actor = actorEmail(auth);

    if (action === "approve") {
      const result = await approveProposalForSharing(id, {
        actor,
        expiresAt: (body.expiresAt as string | null) ?? null,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      });
      return NextResponse.json({
        success: true,
        action: "approve",
        snapshotWritten: result.snapshotWritten,
        proposalId: result.proposal.id,
        status: result.proposal.status,
        shareState: operatorShareStateFromProposal(result.proposal),
      });
    }

    if (action === "prepare") {
      const result = await prepareProposalShareLink(id, {
        actor,
        expiresAt: (body.expiresAt as string | null) ?? null,
      });
      return NextResponse.json({
        success: true,
        action: "prepare",
        created: result.created,
        shareUrlPath: result.shareUrlPath,
        rawToken: result.rawToken,
        proposalId: result.proposal.id,
        status: result.proposal.status,
        shareState: operatorShareStateFromProposal(result.proposal),
      });
    }

    if (action === "replace") {
      const result = await replaceProposalShareLink(id, {
        actor,
        expiresAt: (body.expiresAt as string | null) ?? null,
        confirmReplace: body.confirmReplace === true,
      });
      return NextResponse.json({
        success: true,
        action: "replace",
        shareUrlPath: result.shareUrlPath,
        rawToken: result.rawToken,
        proposalId: result.proposal.id,
        status: result.proposal.status,
        shareState: operatorShareStateFromProposal(result.proposal),
      });
    }

    if (action === "mark-sent") {
      if (!isProposalDeliveryMethod(body.method)) {
        return NextResponse.json(
          { success: false, error: "Choose a delivery method." },
          { status: 400 },
        );
      }
      const result = await markProposalDelivered(id, {
        actor,
        method: body.method,
        deliveredAt: typeof body.deliveredAt === "string" ? body.deliveredAt : null,
        recipient: typeof body.recipient === "string" ? body.recipient : null,
        note: typeof body.note === "string" ? body.note : null,
      });
      return NextResponse.json({
        success: true,
        action: "mark-sent",
        alreadyMarked: result.alreadyMarked,
        proposalId: result.proposal.id,
        status: result.proposal.status,
        shareState: operatorShareStateFromProposal(result.proposal),
      });
    }

    return NextResponse.json({ success: false, error: "Invalid share action." }, { status: 400 });
  } catch (err) {
    if (err instanceof ProposalBuilderError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[KXD Proposal Builder] share failed:", err);
    return NextResponse.json({ success: false, error: "Failed to update share state." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  if (!id || !Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const proposal = await revokeShareLink(
      id,
      typeof body.shareLinkId === "string" ? body.shareLinkId : undefined,
    );
    return NextResponse.json({
      success: true,
      status: proposal.status,
      revoked: true,
      shareState: operatorShareStateFromProposal(proposal),
    });
  } catch (err) {
    if (err instanceof ProposalBuilderError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    return NextResponse.json({ success: false, error: "Failed to revoke share." }, { status: 500 });
  }
}
