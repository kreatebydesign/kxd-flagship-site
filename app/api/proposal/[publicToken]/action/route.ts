import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { executeProposalConversion } from "@/lib/sales/acquisition";
import { getLatestAgreement, validateApprovalRequirements } from "@/lib/sales/contracts";
import { isProposalLinkValid } from "@/lib/sales/public-core";
import { logSalesActivityRecord, publishSalesTimelineEvent } from "@/lib/sales/timeline-events";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await params;
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    where: { publicToken: { equals: publicToken } },
    limit: 1,
    overrideAccess: true,
  });

  const proposal = result.docs[0];
  if (!proposal || !isProposalLinkValid(proposal as Record<string, unknown>)) {
    return NextResponse.json({ success: false, error: "Proposal not available." }, { status: 404 });
  }

  const body = await req.json();
  const action = String(body.action ?? "");

  if (action === "decline") {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposals" as any,
      id: proposal.id as number,
      data: { status: "rejected", approvalStatus: "declined" },
      overrideAccess: true,
    });
    return NextResponse.json({ success: true, status: "rejected" });
  }

  if (action === "request-changes") {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposals" as any,
      id: proposal.id as number,
      data: { approvalStatus: "changes-requested" },
      overrideAccess: true,
    });
    await logSalesActivityRecord(payload, {
      activityType: "follow-up",
      title: `Changes requested · ${proposal.title ?? proposal.proposalNumber}`,
      summary: body.message ?? "Client requested proposal changes.",
      proposalId: proposal.id as number,
    });
    return NextResponse.json({ success: true, status: "changes-requested" });
  }

  if (action === "approve") {
    const agreement = await getLatestAgreement(payload, proposal.id as number);
    const validation = validateApprovalRequirements(proposal, agreement);
    if (!validation.ok) {
      return NextResponse.json({ success: false, errors: validation.errors }, { status: 400 });
    }

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposals" as any,
      id: proposal.id as number,
      data: {
        status: "approved",
        approvalStatus: "ready",
        approvedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    });

    const conversion = await executeProposalConversion(proposal.id as number, payload);

    return NextResponse.json({
      success: true,
      status: "approved",
      conversion,
    });
  }

  return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
}
