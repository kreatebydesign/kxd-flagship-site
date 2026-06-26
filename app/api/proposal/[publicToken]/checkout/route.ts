import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { createProposalCheckoutSession } from "@/lib/sales/payments";
import { isProposalLinkValid } from "@/lib/sales/public-core";

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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const session = await createProposalCheckoutSession(payload, proposal, {
    successUrl: `${baseUrl}/proposal/${publicToken}?payment=success`,
    cancelUrl: `${baseUrl}/proposal/${publicToken}?payment=cancelled`,
    customerEmail: body.email?.trim(),
  });

  if ("error" in session) {
    return NextResponse.json({ success: false, error: session.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, url: session.url, sessionId: session.sessionId });
}
