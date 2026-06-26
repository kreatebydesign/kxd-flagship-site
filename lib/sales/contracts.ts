/**
 * Digital agreement — Payload-safe core.
 */
import type { Payload } from "payload";
import {
  CURRENT_AGREEMENT_VERSION,
  CURRENT_TERMS_VERSION,
  buildAcceptanceHash,
  calculateDepositAmount,
} from "./public-core";
import { logSalesActivityRecord, publishSalesTimelineEvent } from "./timeline-events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface SignAgreementInput {
  proposalId: number;
  signerName: string;
  signerEmail: string;
  company?: string;
  signatureImage: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function signProposalAgreement(
  payload: Payload,
  input: SignAgreementInput,
): Promise<AnyDoc> {
  const proposal = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: input.proposalId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const signedAt = new Date().toISOString();
  const agreementVersion = String(proposal.agreementVersion ?? CURRENT_AGREEMENT_VERSION);
  const acceptanceHash = buildAcceptanceHash({
    proposalId: input.proposalId,
    signerEmail: input.signerEmail,
    agreementVersion,
    signedAt,
  });

  const agreement = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposal-agreements" as any,
    data: {
      proposal: input.proposalId,
      agreementVersion,
      signerName: input.signerName,
      signerEmail: input.signerEmail,
      company: input.company,
      signatureImage: input.signatureImage,
      signedAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      acceptanceHash,
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    },
    overrideAccess: true,
  });

  const clientId =
    typeof proposal.client === "object" && proposal.client !== null
      ? (proposal.client as AnyDoc).id
      : proposal.client;

  await publishSalesTimelineEvent(
    {
      eventType: "sales.agreement-signed",
      clientId: clientId as number | undefined,
      proposalId: input.proposalId,
      title: `Agreement signed · ${proposal.title ?? proposal.proposalNumber}`,
      summary: `${input.signerName} signed the proposal agreement.`,
      metadata: { agreementId: agreement.id, signerEmail: input.signerEmail },
    },
    payload,
  );

  await logSalesActivityRecord(payload, {
    activityType: "note",
    title: `Agreement signed · ${input.signerName}`,
    summary: `Digital agreement v${agreementVersion} accepted.`,
    proposalId: input.proposalId,
    clientId: clientId as number | undefined,
  });

  return agreement as AnyDoc;
}

export async function getLatestAgreement(
  payload: Payload,
  proposalId: number,
): Promise<AnyDoc | null> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposal-agreements" as any,
    where: { proposal: { equals: proposalId } },
    sort: "-signedAt",
    limit: 1,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc) ?? null;
}

export function validateApprovalRequirements(
  proposal: AnyDoc,
  agreement: AnyDoc | null,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!agreement) errors.push("Agreement must be signed.");
  if (!agreement?.signatureImage) errors.push("Signature is required.");
  if (!agreement?.acceptanceHash) errors.push("Agreement acceptance hash missing.");

  const depositRequired = calculateDepositAmount(proposal);
  if (depositRequired > 0) {
    const status = String(proposal.paymentStatus ?? "none");
    if (status !== "deposit-paid" && status !== "paid") {
      errors.push("Deposit payment is required before approval.");
    }
  }

  return { ok: errors.length === 0, errors };
}
