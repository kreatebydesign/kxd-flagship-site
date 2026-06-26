import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { recordProposalViewEvent } from "@/lib/sales/analytics";
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

  const body = await req.json().catch(() => ({}));
  const userAgent = req.headers.get("user-agent");
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const updated = await recordProposalViewEvent(payload, proposal, {
    eventType: body.eventType ?? "page-view",
    sectionId: body.sectionId,
    durationSeconds: body.durationSeconds ? Number(body.durationSeconds) : undefined,
    userAgent,
    ipAddress,
  });

  if (body.eventType === "page-view" || !body.eventType) {
    const clientId =
      typeof proposal.client === "object" && proposal.client !== null
        ? (proposal.client as { id: number }).id
        : proposal.client;

    await publishSalesTimelineEvent(
      {
        eventType: "sales.proposal-viewed",
        clientId: clientId as number | undefined,
        proposalId: proposal.id as number,
        title: `Proposal viewed · ${proposal.title ?? proposal.proposalNumber}`,
        summary: "Prospect opened the public proposal link.",
      },
      payload,
    );

    await logSalesActivityRecord(payload, {
      activityType: "proposal-viewed",
      title: `Proposal viewed · ${proposal.title ?? proposal.proposalNumber}`,
      proposalId: proposal.id as number,
      clientId: clientId as number | undefined,
    });
  }

  return NextResponse.json({ success: true, totalViews: updated.totalViews });
}
