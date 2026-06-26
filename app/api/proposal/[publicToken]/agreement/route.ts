import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { signProposalAgreement } from "@/lib/sales/contracts";
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

  const body = await req.json();
  if (!body.signerName?.trim() || !body.signerEmail?.trim() || !body.signatureImage) {
    return NextResponse.json(
      { success: false, error: "Signer name, email, and signature are required." },
      { status: 400 },
    );
  }

  const agreement = await signProposalAgreement(payload, {
    proposalId: proposal.id as number,
    signerName: body.signerName.trim(),
    signerEmail: body.signerEmail.trim(),
    company: body.company?.trim(),
    signatureImage: body.signatureImage,
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ success: true, agreementId: agreement.id });
}
