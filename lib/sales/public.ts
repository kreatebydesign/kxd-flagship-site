import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { formatAnalyticsDisplay } from "./analytics";
import { getLatestAgreement } from "./contracts";
import { calculateDepositAmount, isProposalLinkValid } from "./public-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PublicProposalDoc = Record<string, any>;

export interface PublicProposalView {
  proposal: PublicProposalDoc;
  agreement: PublicProposalDoc | null;
  depositAmount: number;
  analytics: ReturnType<typeof formatAnalyticsDisplay>;
  publicUrl: string;
}

export async function getProposalByPublicToken(
  publicToken: string,
): Promise<PublicProposalView | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    where: { publicToken: { equals: publicToken } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  });

  const proposal = result.docs[0] as PublicProposalDoc | undefined;
  if (!proposal) return null;
  if (!isProposalLinkValid(proposal)) return null;

  const agreement = await getLatestAgreement(payload, proposal.id as number);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    proposal: sanitizePublicProposal(proposal),
    agreement: agreement ? sanitizeAgreement(agreement) : null,
    depositAmount: calculateDepositAmount(proposal),
    analytics: formatAnalyticsDisplay(proposal),
    publicUrl: `${baseUrl}/proposal/${publicToken}`,
  };
}

export async function getProposalByIdForAdmin(id: number): Promise<PublicProposalDoc | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposals" as any,
      id,
      depth: 2,
      overrideAccess: true,
    });
    return doc as PublicProposalDoc;
  } catch {
    return null;
  }
}

function sanitizePublicProposal(proposal: PublicProposalDoc): PublicProposalDoc {
  const { conversionDraft: _draft, ...rest } = proposal;
  return rest;
}

function sanitizeAgreement(agreement: PublicProposalDoc): PublicProposalDoc {
  return {
    id: agreement.id,
    signerName: agreement.signerName,
    signerEmail: agreement.signerEmail,
    company: agreement.company,
    signedAt: agreement.signedAt,
    agreementVersion: agreement.agreementVersion,
    hasSignature: Boolean(agreement.signatureImage),
  };
}

export async function markProposalSent(proposalId: number): Promise<void> {
  const payload = await getPayload({ config });
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: proposalId,
    data: {
      status: "sent",
      sentAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });
}
