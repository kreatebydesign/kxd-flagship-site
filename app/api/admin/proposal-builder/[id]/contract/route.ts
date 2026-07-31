/**
 * GET — related contract draft
 * PATCH — edit draft / transition status
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { ProposalBuilderError } from "@/lib/proposal-builder/errors";
import {
  getContractForProposal,
  transitionContract,
  updateContractDraft,
} from "@/lib/proposal-builder/services";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const id = Number((await params).id);
  const contract = await getContractForProposal(id);
  if (!contract) {
    return NextResponse.json({ success: false, error: "No contract draft yet." }, { status: 404 });
  }
  return NextResponse.json({ success: true, contract });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const proposalId = Number((await params).id);
  const contract = await getContractForProposal(proposalId);
  if (!contract) {
    return NextResponse.json({ success: false, error: "No contract draft yet." }, { status: 404 });
  }

  try {
    const body = await req.json();
    if (body.status) {
      const updated = await transitionContract(contract.id as number, String(body.status));
      return NextResponse.json({ success: true, contract: updated });
    }

    const updated = await updateContractDraft(contract.id as number, {
      title: body.title,
      body: body.body,
      legalProvisions: body.legalProvisions,
      executiveNotes: body.executiveNotes,
    });
    return NextResponse.json({ success: true, contract: updated });
  } catch (err) {
    if (err instanceof ProposalBuilderError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[KXD Proposal Builder] contract update failed:", err);
    return NextResponse.json({ success: false, error: "Failed to update contract." }, { status: 500 });
  }
}
