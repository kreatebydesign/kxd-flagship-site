/**
 * /api/admin/sales/proposals
 * POST — create proposal
 * PATCH — update proposal
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { createProposalRecord, updateProposalRecord } from "@/lib/sales/proposals";
import { PROPOSAL_STATUSES } from "@/lib/sales/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set(PROPOSAL_STATUSES);

export async function POST(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: "Title is required." }, { status: 400 });
    }

    const record = await createProposalRecord({
      title: body.title.trim(),
      leadId: body.leadId ? Number(body.leadId) : undefined,
      clientId: body.clientId ? Number(body.clientId) : undefined,
      executiveSummary: body.executiveSummary,
      scope: body.scope,
      deliverables: body.deliverables,
      timeline: body.timeline,
      terms: body.terms,
      investment: body.investment != null ? Number(body.investment) : undefined,
      recurringAmount: body.recurringAmount != null ? Number(body.recurringAmount) : undefined,
      investmentSummary: body.investmentSummary,
      sectionBlocks: body.sectionBlocks,
      optionalServices: body.optionalServices,
      expiresAt: body.expiresAt,
    });

    return NextResponse.json({ success: true, id: record.id, proposalNumber: record.proposalNumber });
  } catch (err) {
    console.error("[KXD Sales] Failed to create proposal:", err);
    return NextResponse.json({ success: false, error: "Failed to create proposal." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ success: false, error: "Valid id required." }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.title) data.title = body.title;
    if (body.status && VALID_STATUSES.has(body.status)) data.status = body.status;
    if (body.executiveSummary !== undefined) data.executiveSummary = body.executiveSummary;
    if (body.scope !== undefined) data.scope = body.scope;
    if (body.deliverables !== undefined) data.deliverables = body.deliverables;
    if (body.timeline !== undefined) data.timeline = body.timeline;
    if (body.terms !== undefined) data.terms = body.terms;
    if (body.investment !== undefined) data.investment = Number(body.investment);
    if (body.recurringAmount !== undefined) data.recurringAmount = Number(body.recurringAmount);
    if (body.investmentSummary !== undefined) data.investmentSummary = body.investmentSummary;
    if (body.sectionBlocks !== undefined) data.sectionBlocks = body.sectionBlocks;
    if (body.optionalServices !== undefined) data.optionalServices = body.optionalServices;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt;

    const record = await updateProposalRecord(id, data);
    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    console.error("[KXD Sales] Failed to update proposal:", err);
    return NextResponse.json({ success: false, error: "Failed to update proposal." }, { status: 500 });
  }
}
