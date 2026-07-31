/**
 * Orchestration services for the universal proposal lifecycle.
 * Extends proposal-builder services; keeps Proposal ID 1 untouched by callers.
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { buildCanonicalProposal } from "../proposal-builder/canonicalize.ts";
import { normalizeProposalDocument } from "../proposal-builder/document.ts";
import type { CanonicalProposal } from "../proposal-builder/types.ts";
import { assessBillingReadiness, hasBlockers, blockersForSend } from "./billing-readiness.ts";
import { buildProposedBillingPlan } from "./billing-plan.ts";
import { buildLocalDeliveryPreview } from "./delivery-preview.ts";
import { buildLifecycleEmail } from "./email-templates.ts";
import {
  computeDocumentHash,
  hashPaymentTerms,
  invalidateSignaturesOnMaterialEdit,
  sealExecutedAgreement,
} from "./executed-seal.ts";
import {
  generatePublicToken,
  hashPublicToken,
  newLifecycleId,
  stableJsonHash,
  timingSafeEqualHex,
  tokenPrefix,
} from "./hash.ts";
import { applyMockInvoicePaid, prepareMockStripeDrafts } from "./mock-stripe-billing.ts";
import { processMockWebhookEvent } from "./mock-webhook.ts";
import { appendAudit, emptyLifecyclePackage, normalizeLifecyclePackage } from "./package.ts";
import { humanProgressionFromStatuses } from "./progression.ts";
import { buildTypedSignature } from "./signatures.ts";
import { deriveStructuredPaymentTerms } from "./structured-payment-terms.ts";
import {
  assertContractMutable,
  assertContractTransition,
  assertNotProtectedProposal,
} from "./transitions.ts";
import type {
  ContractLifecyclePackage,
  EnhancedAcceptanceInput,
  LocalDeliveryPreview,
  ProposedBillingPlan,
} from "./types.ts";

const CONTRACTS = "contracts";
const PROPOSALS = "proposals";

type AnyDoc = Record<string, unknown> & { id: number };

async function payloadClient() {
  return getPayload({ config });
}

function asId(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value && "id" in value) {
    return Number((value as { id: number }).id);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function getContractLifecycle(contractId: number): Promise<{
  contract: AnyDoc;
  pkg: ContractLifecyclePackage;
  proposal: AnyDoc | null;
  canonical: CanonicalProposal | null;
}> {
  const payload = await payloadClient();
  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: contractId,
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  const pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  const proposalId = asId(contract.proposal);
  let proposal: AnyDoc | null = null;
  let canonical: CanonicalProposal | null = null;
  if (proposalId) {
    proposal = (await payload.findByID({
      collection: PROPOSALS as never,
      id: proposalId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    if (proposal.acceptedSnapshot) {
      canonical = proposal.acceptedSnapshot as CanonicalProposal;
    } else if (proposal.builderDocument) {
      canonical = buildCanonicalProposal({
        id: proposal.id,
        proposalNumber: String(proposal.proposalNumber ?? ""),
        title: String(proposal.title ?? ""),
        status: String(proposal.status ?? "draft"),
        proposalDate: proposal.proposalDate as string,
        expiresAt: proposal.expiresAt as string,
        revisionNumber: Number(proposal.revisionNumber ?? 1),
        builderDocument: normalizeProposalDocument(proposal.builderDocument),
      });
    }
  }

  return { contract, pkg, proposal, canonical };
}

export async function ensureLifecycleHydrated(contractId: number): Promise<ContractLifecyclePackage> {
  const { pkg, canonical, proposal } = await getContractLifecycle(contractId);
  let next = pkg;
  if (!next.structuredPaymentTerms && canonical) {
    const acceptanceHash =
      (proposal?.acceptanceRecord as { acceptanceHash?: string } | null)?.acceptanceHash;
    next = {
      ...next,
      structuredPaymentTerms: deriveStructuredPaymentTerms(canonical, acceptanceHash),
    };
  }
  const issues = assessBillingReadiness({
    canonical,
    terms: next.structuredPaymentTerms ?? null,
    pkg: next,
    clientLegalName:
      next.clientBillingIdentity?.legalName ?? canonical?.primaryOrganization,
    billingEmail:
      next.clientBillingIdentity?.billingEmail ??
      next.structuredPaymentTerms?.billingEmail,
    billingAddressPresent:
      Boolean(next.clientBillingIdentity?.billingAddressPresent) ||
      Boolean(next.clientBillingIdentity?.billingAddress),
    operatorSigned: Boolean(next.operatorSignature),
  });
  next = { ...next, billingReadinessIssues: issues };

  if (JSON.stringify(next) !== JSON.stringify(pkg)) {
    const payload = await payloadClient();
    await payload.update({
      collection: CONTRACTS as never,
      id: contractId,
      data: { lifecyclePackage: next } as never,
      overrideAccess: true,
    });
  }
  return next;
}

export async function simulateLocalProposalSend(input: {
  proposalId: number;
  recipientName: string;
  recipientEmail: string;
  createdBy?: string | null;
  baseUrl?: string;
}): Promise<{ preview: LocalDeliveryPreview; publicUrl: string; proposal: AnyDoc }> {
  assertNotProtectedProposal(input.proposalId, "send or simulate send");
  const payload = await payloadClient();
  const proposal = (await payload.findByID({
    collection: PROPOSALS as never,
    id: input.proposalId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const { approveProposalForSharing, markProposalShared } = await import(
    "../proposal-builder/services.ts"
  );

  const status = String(proposal.status);
  let rawToken = "";
  if (status === "draft" || status === "internal-review" || status === "approved-for-sharing") {
    const approved = await approveProposalForSharing(input.proposalId, {
      notes: "Local lifecycle — approved for simulated send",
      actor: input.createdBy ?? null,
    });
    rawToken = approved.rawToken;
  } else {
    const approved = await approveProposalForSharing(input.proposalId, {
      notes: "Local lifecycle — re-issue share token for simulated send",
      actor: input.createdBy ?? null,
    });
    rawToken = approved.rawToken;
  }
  await markProposalShared(input.proposalId);

  const refreshed = (await payload.findByID({
    collection: PROPOSALS as never,
    id: input.proposalId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  if (!rawToken) {
    throw new Error("No public token available after share.");
  }
  const base = (input.baseUrl ?? "http://localhost:3000").replace(/\/$/, "");
  const publicUrl = `${base}/proposal/${rawToken}`;
  const snapHash = refreshed.shareSnapshot
    ? stableJsonHash(refreshed.shareSnapshot)
    : null;

  const email = buildLifecycleEmail({
    kind: "proposal-send",
    recipientName: input.recipientName,
    proposalNumber: String(refreshed.proposalNumber),
    proposalTitle: String(refreshed.title),
    secureUrl: publicUrl,
  });

  const preview = buildLocalDeliveryPreview({
    kind: "proposal-send",
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    subject: email.subject,
    bodyText: `${email.bodyText}\n\nSIMULATED LOCAL DELIVERY — this message was not emailed.`,
    bodyHtml: email.bodyHtml,
    templateVersion: email.templateVersion,
    secureUrl: publicUrl,
    rawToken,
    createdBy: input.createdBy,
    relatedProposalId: input.proposalId,
    version: Number(refreshed.revisionNumber ?? 1),
    snapshotHash: snapHash,
  });

  return { preview, publicUrl, proposal: refreshed };
}

export async function signContractAsOperator(
  contractId: number,
  input: {
    legalName: string;
    title: string;
    entityName: string;
    email: string;
    typedAcknowledgment: string;
    authorityConfirmed: boolean;
    electronicRecordsConsent: boolean;
    actor?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<{ contract: AnyDoc; pkg: ContractLifecyclePackage }> {
  const { contract, pkg, canonical, proposal } = await getContractLifecycle(contractId);
  assertContractMutable(String(contract.status));
  if (pkg.operatorSignature && ["partially-signed", "sent-for-signature"].includes(String(contract.status))) {
    return { contract, pkg };
  }
  let from = String(contract.status);
  const payload = await payloadClient();

  // Advance through internal review → ready for signature when needed.
  if (from === "draft") {
    assertContractTransition("draft", "internal-review");
    await payload.update({
      collection: CONTRACTS as never,
      id: contractId,
      data: { status: "internal-review" } as never,
      overrideAccess: true,
    });
    from = "internal-review";
  }
  if (from === "internal-review") {
    assertContractTransition("internal-review", "approved-for-signature");
    await payload.update({
      collection: CONTRACTS as never,
      id: contractId,
      data: { status: "approved-for-signature" } as never,
      overrideAccess: true,
    });
    from = "approved-for-signature";
  }
  assertContractTransition(from, "partially-signed");

  const terms =
    pkg.structuredPaymentTerms ??
    (canonical ? deriveStructuredPaymentTerms(canonical) : null);
  if (!terms) throw new Error("Structured payment terms required before signature.");

  const acceptedHash = proposal?.acceptedSnapshot
    ? stableJsonHash(proposal.acceptedSnapshot)
    : "missing-accepted-snapshot";
  const documentHash = computeDocumentHash({
    contractId,
    contractBody: String(contract.body ?? ""),
    acceptedSnapshotHash: acceptedHash,
    paymentTermsHash: hashPaymentTerms(terms),
    version: Number(contract.revisionNumber ?? 1) || 1,
  });

  const signature = buildTypedSignature({
    ...input,
    actorRole: "kxd-operator",
    documentHash,
  });

  let next: ContractLifecyclePackage = {
    ...pkg,
    structuredPaymentTerms: terms,
    operatorSignature: signature,
  };
  next = appendAudit(next, {
    actor: input.actor ?? input.email,
    action: "operator.signed",
    fromStatus: from,
    toStatus: "partially-signed",
    sourceVersion: 1,
  });

  const updated = (await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: {
      status: "partially-signed",
      signedAt: signature.signedAt,
      lifecyclePackage: next,
    } as never,
    overrideAccess: true,
  })) as AnyDoc;

  try {
    const { notifyLifecycleEvent } = await import("./notifications.ts");
    await notifyLifecycleEvent({
      title: `Contract signed by KXD — ${String(updated.title)}`,
      summary: "Operator signature recorded. Ready to send for client signature after readiness review.",
      clientId: asId(updated.client) ?? undefined,
      severity: "info",
      href: `/admin/sales/contracts/${contractId}`,
      metadata: { kind: "contract.operator-signed", contractId },
    });
  } catch {
    /* best-effort */
  }

  return { contract: updated, pkg: next };
}

export async function sendContractForClientSignature(input: {
  contractId: number;
  recipientName: string;
  recipientEmail: string;
  createdBy?: string | null;
  baseUrl?: string;
  forceDespiteBillingBlockers?: boolean;
}): Promise<{
  preview: LocalDeliveryPreview;
  rawToken: string;
  signingUrl: string;
  pkg: ContractLifecyclePackage;
}> {
  const hydrated = await ensureLifecycleHydrated(input.contractId);
  const { contract, canonical, proposal } = await getContractLifecycle(input.contractId);
  if (!hydrated.operatorSignature) {
    throw new Error("KXD operator signature is required before sending.");
  }
  const sendBlockers = blockersForSend(hydrated.billingReadinessIssues ?? []);
  if (sendBlockers.length && !input.forceDespiteBillingBlockers) {
    throw new Error(
      `Contract send blocked: ${sendBlockers.map((b) => b.code).join(", ")}`,
    );
  }

  const from = String(contract.status);
  assertContractTransition(from, "sent-for-signature");

  const rawToken = generatePublicToken();
  const tokenHash = hashPublicToken(rawToken);
  const base = (input.baseUrl ?? "http://localhost:3000").replace(/\/$/, "");
  const secureUrl = `${base}/contract/${rawToken}`;
  const email = buildLifecycleEmail({
    kind: "contract-send",
    recipientName: input.recipientName,
    contractTitle: String(contract.title),
    proposalNumber: proposal ? String(proposal.proposalNumber) : undefined,
    secureUrl,
  });
  const preview = buildLocalDeliveryPreview({
    kind: "contract-signature-send",
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    subject: email.subject,
    bodyText: `${email.bodyText}\n\nSIMULATED LOCAL DELIVERY — this message was not emailed.`,
    bodyHtml: email.bodyHtml,
    templateVersion: email.templateVersion,
    secureUrl,
    rawToken,
    createdBy: input.createdBy,
    relatedContractId: input.contractId,
    relatedProposalId: asId(contract.proposal),
    snapshotHash: hydrated.operatorSignature.documentHash,
  });

  let next: ContractLifecyclePackage = {
    ...hydrated,
    signingTokenHash: tokenHash,
    signingTokenPrefix: tokenPrefix(rawToken),
    signingTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    signingTokenRevokedAt: null,
    sentForSignatureAt: new Date().toISOString(),
    sentForSignatureBy: input.createdBy ?? null,
    deliveryPreviews: [...(hydrated.deliveryPreviews ?? []), preview],
  };
  next = appendAudit(next, {
    actor: input.createdBy,
    action: "contract.sent-for-client-signature",
    fromStatus: from,
    toStatus: "sent-for-signature",
  });

  const payload = await payloadClient();
  await payload.update({
    collection: CONTRACTS as never,
    id: input.contractId,
    data: {
      status: "sent-for-signature",
      sentAt: next.sentForSignatureAt,
      publicToken: null,
      signingTokenHash: tokenHash,
      signerName: input.recipientName,
      signerEmail: input.recipientEmail,
      lifecyclePackage: next,
    } as never,
    overrideAccess: true,
  });

  void canonical;
  return { preview, rawToken, signingUrl: secureUrl, pkg: next };
}

export async function signContractAsClient(
  rawToken: string,
  input: EnhancedAcceptanceInput & {
    electronicRecordsConsent: boolean;
  },
): Promise<{
  contract: AnyDoc;
  pkg: ContractLifecyclePackage;
  alreadySigned: boolean;
  completionToken?: string;
}> {
  const payload = await payloadClient();
  const tokenHash = hashPublicToken(rawToken);
  const found = await payload.find({
    collection: CONTRACTS as never,
    where: { signingTokenHash: { equals: tokenHash } },
    limit: 1,
    overrideAccess: true,
  });
  let contract = found.docs[0] as AnyDoc | undefined;
  if (!contract && process.env.KXD_ALLOW_LEGACY_PLAINTEXT_TOKENS === "1") {
    // Opt-in local QA only — never enable in production.
    const legacy = await payload.find({
      collection: CONTRACTS as never,
      where: { publicToken: { equals: rawToken } },
      limit: 1,
      overrideAccess: true,
    });
    contract = legacy.docs[0] as AnyDoc | undefined;
  }
  if (!contract) throw new Error("Agreement not available.");

  let pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  if (["voided", "superseded", "expired", "declined"].includes(String(contract.status))) {
    throw new Error("Agreement is no longer available for signature.");
  }
  if (pkg.signingTokenRevokedAt) throw new Error("Signing link has been revoked.");
  if (pkg.signingTokenExpiresAt && Date.parse(pkg.signingTokenExpiresAt) < Date.now()) {
    throw new Error("Signing link has expired.");
  }
  if (pkg.signingTokenHash && !timingSafeEqualHex(pkg.signingTokenHash, tokenHash)) {
    throw new Error("Invalid signing token.");
  }
  if (pkg.clientSignature && pkg.executedCertificate) {
    return { contract, pkg, alreadySigned: true };
  }
  const operatorSignature = pkg.operatorSignature;
  if (!operatorSignature) throw new Error("Agreement is not ready for client signature.");

  const status = String(contract.status);
  if (!["sent-for-signature", "sent", "viewed", "partially-signed"].includes(status)) {
    throw new Error(`Agreement status ${status} cannot accept client signature.`);
  }

  pkg = {
    ...pkg,
    clientViewedAt: pkg.clientViewedAt ?? new Date().toISOString(),
  };

  const clientSig = buildTypedSignature({
    legalName: input.name,
    title: input.title,
    entityName: input.organization,
    email: input.email,
    typedAcknowledgment: input.typedAcknowledgment,
    authorityConfirmed: input.authorityConfirmed,
    electronicRecordsConsent: input.electronicRecordsConsent,
    actorRole: "client",
    documentHash: operatorSignature.documentHash,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const proposalId = asId(contract.proposal) ?? 0;
  const proposal = proposalId
    ? ((await payload.findByID({
        collection: PROPOSALS as never,
        id: proposalId,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc)
    : null;

  const certificate = sealExecutedAgreement({
    contractId: contract.id,
    proposalId,
    proposalNumber: String(proposal?.proposalNumber ?? ""),
    proposalVersion: Number(proposal?.revisionNumber ?? 1),
    contractVersion: 1,
    documentHash: operatorSignature.documentHash,
    operator: operatorSignature,
    client: clientSig,
  });

  // Billing plan preparation (blocked until readiness cleared — still created for review)
  const { canonical } = await getContractLifecycle(contract.id);
  const terms =
    pkg.structuredPaymentTerms ??
    (canonical ? deriveStructuredPaymentTerms(canonical) : null);
  const issues = assessBillingReadiness({
    canonical,
    terms,
    pkg: { ...pkg, clientSignature: clientSig },
    clientLegalName: input.organization,
    billingEmail: input.email,
    billingAddressPresent: false,
    operatorSigned: true,
  });

  let billingPlan: ProposedBillingPlan | null = null;
  if (terms) {
    billingPlan = buildProposedBillingPlan({
      contractId: contract.id,
      proposalId,
      proposalNumber: String(proposal?.proposalNumber ?? ""),
      contractVersion: 1,
      contractHash: certificate.documentHash,
      terms,
      issues,
    });
    if (!hasBlockers(issues) && billingPlan.reconciliation.differenceCents === 0) {
      billingPlan = prepareMockStripeDrafts(billingPlan).plan;
    }
  }

  let next: ContractLifecyclePackage = {
    ...pkg,
    structuredPaymentTerms: terms,
    clientSignature: clientSig,
    executedCertificate: certificate,
    signingTokenRevokedAt: new Date().toISOString(),
    billingReadinessIssues: issues,
    billingPlan,
  };
  next = appendAudit(next, {
    actor: input.email,
    action: "client.signed",
    fromStatus: status,
    toStatus: "executed",
    correlationId: input.correlationId,
  });
  next = appendAudit(next, {
    actor: "system",
    action: "agreement.fully-executed",
    toStatus: "executed",
  });

  const completionRaw = generatePublicToken();
  next = {
    ...next,
    completionTokenHash: hashPublicToken(completionRaw),
    completionTokenPrefix: tokenPrefix(completionRaw),
    completionTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
  };

  if (terms && canonical && operatorSignature) {
    try {
      const { generateAndFileExecutedPackage } = await import("./documents/file.ts");
      next = await generateAndFileExecutedPackage({
        contractId: contract.id,
        proposalId,
        clientId: asId(contract.client),
        proposalNumber: String(proposal?.proposalNumber ?? ""),
        contractTitle: String(contract.title ?? "Agreement"),
        contractBody: String(contract.body ?? ""),
        canonical,
        certificate,
        operator: operatorSignature,
        client: clientSig,
        terms,
        pkg: next,
      });
    } catch (err) {
      next = appendAudit(next, {
        actor: "system",
        action: "documents.filing-failed",
        reason: err instanceof Error ? err.message : "filing failed",
      });
    }
  }

  const updated = (await payload.update({
    collection: CONTRACTS as never,
    id: contract.id,
    data: {
      status: "executed",
      signedAt: clientSig.signedAt,
      executedSnapshot: {
        certificate,
        operatorSignature,
        clientSignature: clientSig,
        sealedAt: certificate.sealedAt,
      },
      lifecyclePackage: next,
      publicToken: null,
      signingTokenHash: null,
    } as never,
    overrideAccess: true,
  })) as AnyDoc;

  try {
    const { notifyLifecycleEvent } = await import("./notifications.ts");
    await notifyLifecycleEvent({
      title: `Agreement fully executed — ${String(updated.title)}`,
      summary:
        "Both signatures sealed. Review the proposed billing plan before any Stripe draft is finalized or sent.",
      clientId: asId(updated.client) ?? undefined,
      severity: "success",
      href: `/admin/sales/contracts/${contract.id}`,
      metadata: {
        kind: "agreement.fully-executed",
        contractId: contract.id,
        verificationId: certificate.verificationId,
      },
    });
  } catch {
    /* best-effort */
  }

  // One-time completion token for authorized package download — hash only at rest.
  return { contract: updated, pkg: next, alreadySigned: false, completionToken: completionRaw };
}

export async function simulateVerifiedInitialPayment(
  contractId: number,
): Promise<ContractLifecyclePackage> {
  const { pkg } = await getContractLifecycle(contractId);
  if (!pkg.billingPlan) throw new Error("No billing plan on contract.");
  let workingPlan = pkg.billingPlan;
  // Local/mock path: prepare draft Stripe objects for review even when live
  // KXD invoice identity remains incomplete (still blocked for live send).
  if (!workingPlan.mockStripe?.customerId) {
    workingPlan = prepareMockStripeDrafts(workingPlan, {
      allowWhileBlockedForLocalMock: true,
    }).plan;
  }
  const initial = workingPlan.obligations.find((o) => o.kind === "initial");
  if (!initial) throw new Error("No initial obligation.");
  const plan = applyMockInvoicePaid(workingPlan, initial.id);
  let next: ContractLifecyclePackage = {
    ...pkg,
    billingPlan: plan,
    onboardingEligible: true,
    onboardingEligibleAt: new Date().toISOString(),
  };
  next = appendAudit(next, {
    actor: "stripe-mock-webhook",
    action: "invoice.paid",
    reason: `obligation:${initial.id}`,
  });
  next = appendAudit(next, {
    actor: "system",
    action: "onboarding.eligible",
    reason: "Initial payment verified — onboarding remains manual.",
  });

  const payload = await payloadClient();
  await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: { lifecyclePackage: next } as never,
    overrideAccess: true,
  });

  try {
    const { notifyLifecycleEvent } = await import("./notifications.ts");
    const { contract } = await getContractLifecycle(contractId);
    await notifyLifecycleEvent({
      title: "Initial payment verified (mock)",
      summary:
        "Mock webhook marked the initial obligation paid. Onboarding is eligible but remains manual.",
      clientId: asId(contract.client) ?? undefined,
      severity: "success",
      href: `/admin/sales/contracts/${contractId}`,
      metadata: { kind: "invoice.paid.mock", contractId, livemode: false },
    });
  } catch {
    /* best-effort */
  }

  return next;
}

export function summarizeProgression(input: {
  proposalStatus: string;
  contractStatus?: string | null;
  pkg?: ContractLifecyclePackage | null;
}) {
  const pkg = input.pkg ?? emptyLifecyclePackage();
  const initial = pkg.billingPlan?.obligations.find((o) => o.kind === "initial");
  return humanProgressionFromStatuses({
    proposalStatus: input.proposalStatus,
    contractStatus: input.contractStatus,
    billingPlanStatus: pkg.billingPlan?.status,
    initialObligationStatus: initial?.status,
    onboardingEligible: pkg.onboardingEligible,
  });
}

export function markMaterialContractEdit(pkg: ContractLifecyclePackage): ContractLifecyclePackage {
  return appendAudit(invalidateSignaturesOnMaterialEdit(pkg), {
    actor: "operator",
    action: "contract.material-edit-invalidated-signatures",
  });
}

export async function resolveClientBillingIdentity(
  contractId: number,
  input: {
    legalName?: string;
    billingEmail?: string;
    billingAddress?: string;
    taxTreatment?: "exclusive" | "inclusive" | "exempt";
    actor?: string | null;
  },
): Promise<ContractLifecyclePackage> {
  const { contract, pkg, canonical } = await getContractLifecycle(contractId);
  const status = String(contract.status);
  if (["voided", "superseded"].includes(status)) {
    throw new Error("Cannot update billing identity on voided/superseded contract.");
  }

  let terms = pkg.structuredPaymentTerms;
  if (terms && input.taxTreatment) {
    terms = {
      ...terms,
      taxes: {
        treatment: input.taxTreatment,
        notes: "Operator-reviewed tax treatment (local).",
      },
      billingEmail: input.billingEmail?.trim() || terms.billingEmail,
      billingContactName: input.legalName?.trim() || terms.billingContactName,
    };
  }

  let next: ContractLifecyclePackage = {
    ...pkg,
    structuredPaymentTerms: terms,
    clientBillingIdentity: {
      legalName: input.legalName?.trim() || pkg.clientBillingIdentity?.legalName || null,
      billingEmail: input.billingEmail?.trim() || pkg.clientBillingIdentity?.billingEmail || null,
      billingAddress:
        input.billingAddress?.trim() || pkg.clientBillingIdentity?.billingAddress || null,
      taxTreatment: input.taxTreatment || pkg.clientBillingIdentity?.taxTreatment || null,
      billingAddressPresent: Boolean(
        input.billingAddress?.trim() || pkg.clientBillingIdentity?.billingAddress,
      ),
    },
  };
  next = {
    ...next,
    billingReadinessIssues: assessBillingReadiness({
      canonical,
      terms: next.structuredPaymentTerms ?? null,
      pkg: next,
      clientLegalName: next.clientBillingIdentity?.legalName,
      billingEmail: next.clientBillingIdentity?.billingEmail,
      billingAddressPresent: next.clientBillingIdentity?.billingAddressPresent,
      operatorSigned: Boolean(next.operatorSignature),
    }),
  };
  next = appendAudit(next, {
    actor: input.actor,
    action: "billing-identity.resolved",
  });

  const payload = await payloadClient();
  await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: { lifecyclePackage: next } as never,
    overrideAccess: true,
  });
  return next;
}

export async function voidContract(
  contractId: number,
  input: { reason: string; actor?: string | null },
): Promise<ContractLifecyclePackage> {
  if (!input.reason?.trim()) throw new Error("Void reason is required.");
  const { contract, pkg } = await getContractLifecycle(contractId);
  const from = String(contract.status);
  if (from === "voided") return pkg;
  assertContractTransition(from, "voided");

  let next: ContractLifecyclePackage = {
    ...pkg,
    voidReason: input.reason.trim(),
    signingTokenRevokedAt: new Date().toISOString(),
  };
  next = appendAudit(next, {
    actor: input.actor,
    action: "contract.voided",
    fromStatus: from,
    toStatus: "voided",
    reason: input.reason.trim(),
  });

  const payload = await payloadClient();
  await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: {
      status: "voided",
      publicToken: null,
      signingTokenHash: null,
      lifecyclePackage: next,
    } as never,
    overrideAccess: true,
  });
  return next;
}

export async function prepareMockStripeDraftsForContract(
  contractId: number,
): Promise<ContractLifecyclePackage> {
  const { pkg } = await getContractLifecycle(contractId);
  if (!pkg.billingPlan) throw new Error("No billing plan.");
  if (pkg.billingPlan.reconciliation.differenceCents !== 0) {
    throw new Error("Reconciliation difference blocks mock Stripe prep.");
  }
  const prepared = prepareMockStripeDrafts(pkg.billingPlan, {
    allowWhileBlockedForLocalMock: true,
  }).plan;
  let next: ContractLifecyclePackage = { ...pkg, billingPlan: prepared };
  next = appendAudit(next, {
    actor: "operator",
    action: "billing.mock-stripe-drafts-prepared",
    reason: "TEST/MOCK only — livemode false",
  });
  const payload = await payloadClient();
  await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: { lifecyclePackage: next } as never,
    overrideAccess: true,
  });
  return next;
}

export async function processLifecycleMockPaymentWebhook(
  contractId: number,
  event: {
    id: string;
    type: "invoice.paid" | "invoice.payment_failed" | "invoice.voided";
    livemode: boolean;
    obligationId?: string;
    amountCents?: number;
    currency?: string;
    clientId?: number;
  },
): Promise<ContractLifecyclePackage> {
  const { contract, pkg } = await getContractLifecycle(contractId);
  if (!pkg.billingPlan) throw new Error("No billing plan.");
  if (pkg.onboardingEligible && event.type === "invoice.paid") {
    // Idempotent — already eligible
    const processed = pkg.processedWebhookEventIds ?? [];
    if (processed.includes(event.id)) return pkg;
  }

  const result = processMockWebhookEvent({
    event: {
      ...event,
      contractId,
      receivedAt: new Date().toISOString(),
    },
    plan: pkg.billingPlan,
    processedEventIds: pkg.processedWebhookEventIds ?? [],
    expectedContractId: contractId,
    expectedClientId: asId(contract.client),
  });
  if (!result.ok || !result.plan) {
    throw new Error(result.error || "Mock webhook rejected.");
  }

  const initialPaid = result.plan.obligations.some(
    (o) => o.kind === "initial" && o.status === "paid",
  );
  let next: ContractLifecyclePackage = {
    ...pkg,
    billingPlan: result.plan,
    processedWebhookEventIds: result.processedEventIds,
    onboardingEligible: initialPaid ? true : pkg.onboardingEligible,
    onboardingEligibleAt:
      initialPaid && !pkg.onboardingEligible
        ? new Date().toISOString()
        : pkg.onboardingEligibleAt,
  };
  next = appendAudit(next, {
    actor: "stripe-mock-webhook",
    action: event.type,
    reason: result.duplicate ? "duplicate" : event.id,
  });
  if (initialPaid && !pkg.onboardingEligible) {
    next = appendAudit(next, {
      actor: "system",
      action: "onboarding.eligible",
      reason: "Initial payment verified — onboarding remains manual.",
    });
  }

  const payload = await payloadClient();
  await payload.update({
    collection: CONTRACTS as never,
    id: contractId,
    data: { lifecyclePackage: next } as never,
    overrideAccess: true,
  });
  return next;
}

export { newLifecycleId };
