import { getPayload } from "payload";
import config from "@payload-config";
import { composeDirectAgreementDocumentBody } from "@/lib/commercial-legal";
import { publishClientActivity } from "@/lib/client-command/activity/publish";
import { newLifecycleId, stableJsonHash } from "@/lib/proposal-lifecycle/hash";
import { computeDocumentHash, hashPaymentTerms } from "@/lib/proposal-lifecycle/executed-seal";
import { buildTypedSignature } from "@/lib/proposal-lifecycle/signatures";
import { appendAudit, emptyLifecyclePackage, normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import {
  generateAndFileDirectAgreementSentSnapshot,
  generateAndFileExecutedPackage,
} from "@/lib/proposal-lifecycle/documents/file";
import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";
import {
  assertOneTimeHasNoRecurring,
  deriveStructuredPaymentTermsFromDirectAgreement,
} from "./payment-terms";
import type { CreateDirectAgreementInput } from "./types";
import {
  parseStoredDirectAgreementTerms,
  validateCreateDirectAgreementInput,
  validateExternalAcceptanceInput,
  validatePaymentAuthorizationInput,
} from "./validate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const CONTRACTS = "contracts";

async function payloadClient() {
  return getPayload({ config });
}

function asId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isInteger(id) ? id : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function assertTermsUnlocked(pkg: ContractLifecyclePackage, contract: AnyDoc): void {
  const status = String(contract.status);
  if (["executed", "signed", "voided", "superseded"].includes(status)) {
    throw new Error("Accepted or closed agreements cannot be silently mutated. Create a new version or amendment.");
  }
  if (pkg.externalAcceptance || pkg.executedCertificate) {
    throw new Error("Accepted agreement terms are locked. Create a superseding agreement to change terms.");
  }
  if (pkg.termsLockedHash && pkg.commercialStatus && !["draft", "finalized"].includes(pkg.commercialStatus)) {
    // Allow finalize→send transitions but block field mutation after acceptance path starts
  }
}

export async function createDirectAgreement(
  input: CreateDirectAgreementInput,
): Promise<{ contractId: number; proposalCreated: false }> {
  const validated = validateCreateDirectAgreementInput(input);
  if (!validated.ok) {
    const message = Object.entries(validated.errors)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    throw new Error(`Direct Agreement validation failed — ${message}`);
  }

  const payload = await payloadClient();
  let client: AnyDoc;
  try {
    client = (await payload.findByID({
      collection: "clients" as never,
      id: input.clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    throw new Error("Existing client record is required. Duplicate or orphan clients are not created.");
  }

  const terms = validated.terms;
  const projectAmount = terms.oneTimeAmountCents / 100;
  const monthlyAmount = terms.monthlyAmountCents / 100;

  let pkg = emptyLifecyclePackage();
  pkg = {
    ...pkg,
    commercialSource: "direct-agreement",
    commercialStatus: "draft",
  };
  pkg = appendAudit(pkg, {
    actor: input.actor ?? null,
    action: "direct-agreement.created",
    toStatus: "draft",
    reason: "Direct Agreement created without a proposal",
  });

  const created = (await payload.create({
    collection: CONTRACTS as never,
    data: {
      client: input.clientId,
      proposal: undefined,
      template: input.templateId ?? undefined,
      status: "draft",
      contractType: input.contractType,
      title: input.title.trim(),
      publicTitle: input.publicTitle?.trim() || input.title.trim(),
      body: input.body.trim(),
      terms: input.terms?.trim() || terms.paymentTerms,
      executiveNotes: input.executiveNotes?.trim() || undefined,
      monthlyAmount: monthlyAmount > 0 ? monthlyAmount : undefined,
      projectAmount: projectAmount > 0 ? projectAmount : undefined,
      startDate: terms.serviceStartDate,
      expiresAt: terms.serviceEndDate || undefined,
      serviceEndDate: terms.serviceEndDate || undefined,
      agreementSource: "direct-agreement",
      directAgreementTerms: terms,
      lifecyclePackage: pkg,
    } as never,
    overrideAccess: true,
  })) as AnyDoc;

  const contractId = Number(created.id);

  await publishClientActivity(
    {
      clientId: input.clientId,
      sourceModule: "Sales",
      sourceType: "contract",
      sourceId: contractId,
      eventType: "direct-agreement.created",
      title: `Direct Agreement created — ${input.title.trim()}`,
      summary: `Source: direct-agreement. No proposal. Client ${String(client.name ?? input.clientId)}.`,
      author: input.actor ?? undefined,
      metadata: {
        agreementSource: "direct-agreement",
        contractId,
        commercialStructure: terms.commercialStructure,
        oneTimeAmountCents: terms.oneTimeAmountCents,
        monthlyAmountCents: terms.monthlyAmountCents,
      },
      relatedLinks: [
        {
          label: "Open agreement",
          href: `/admin/operations/client-command/${input.clientId}/commercial/agreements/${contractId}`,
        },
      ],
      internalOnly: true,
    },
    payload,
  );

  return { contractId, proposalCreated: false };
}

export async function finalizeDirectAgreement(input: {
  contractId: number;
  actor?: string | null;
}): Promise<{ pkg: ContractLifecyclePackage }> {
  const payload = await payloadClient();
  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: input.contractId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  if (String(contract.agreementSource) !== "direct-agreement") {
    throw new Error("Finalize Direct Agreement applies only to direct-agreement source contracts.");
  }
  const clientId = asId(contract.client);
  if (!clientId) throw new Error("Direct Agreement requires a client relationship.");
  if (asId(contract.proposal)) {
    throw new Error("Direct Agreement must not be linked to a proposal.");
  }

  let pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  assertTermsUnlocked(pkg, contract);

  const terms = parseStoredDirectAgreementTerms(contract.directAgreementTerms);
  if (!terms) throw new Error("Direct Agreement terms are missing or invalid.");

  const structured = deriveStructuredPaymentTermsFromDirectAgreement(terms, input.contractId);
  const noRecurring = assertOneTimeHasNoRecurring(structured);
  if (!noRecurring.ok) throw new Error(noRecurring.reason);

  const lockedHash = stableJsonHash({
    terms,
    body: String(contract.body ?? ""),
    title: String(contract.title ?? ""),
  });

  pkg = {
    ...pkg,
    commercialSource: "direct-agreement",
    commercialStatus: "finalized",
    structuredPaymentTerms: structured,
    termsFinalizedAt: new Date().toISOString(),
    termsLockedHash: lockedHash,
  };
  pkg = appendAudit(pkg, {
    actor: input.actor ?? null,
    action: "direct-agreement.finalized",
    fromStatus: "draft",
    toStatus: "finalized",
  });

  const documentBody = composeDirectAgreementDocumentBody({
    body: String(contract.body ?? ""),
    terms,
  });

  pkg = await generateAndFileDirectAgreementSentSnapshot({
    contractId: input.contractId,
    clientId,
    contractTitle: String(contract.title ?? ""),
    contractBody: documentBody,
    terms: structured,
    termsVersion: terms.termsVersion,
    pkg,
    actor: input.actor,
  });

  await payload.update({
    collection: CONTRACTS as never,
    id: input.contractId,
    data: {
      status: "approved-for-signature",
      projectAmount: terms.oneTimeAmountCents / 100,
      monthlyAmount: terms.monthlyAmountCents > 0 ? terms.monthlyAmountCents / 100 : null,
      lifecyclePackage: pkg,
    } as never,
    overrideAccess: true,
  });

  await publishClientActivity(
    {
      clientId,
      sourceModule: "Sales",
      sourceType: "contract",
      sourceId: input.contractId,
      eventType: "direct-agreement.finalized",
      title: `Direct Agreement finalized — ${String(contract.title)}`,
      summary: "Terms locked and sent-snapshot PDF filed. Acceptance still required.",
      author: input.actor ?? undefined,
      metadata: { contractId: input.contractId, agreementSource: "direct-agreement" },
      internalOnly: true,
    },
    payload,
  );

  return { pkg };
}

export async function recordExternalAcceptance(input: {
  contractId: number;
  acceptedBy: string;
  acceptedAt: string;
  method: string;
  evidenceNotes: string;
  evidenceReference?: string | null;
  actor: string;
  /** Optional operator typed acknowledgment before recording external acceptance. */
  operatorLegalName?: string;
  operatorTitle?: string;
  operatorEmail?: string;
}): Promise<{ pkg: ContractLifecyclePackage }> {
  const payload = await payloadClient();
  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: input.contractId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const clientId = asId(contract.client);
  if (!clientId) throw new Error("Client relationship required.");

  let pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  if (pkg.externalAcceptance || pkg.executedCertificate) {
    throw new Error("Acceptance is already recorded for this agreement.");
  }
  if (pkg.clientSignature) {
    throw new Error("Electronic signature already recorded — do not also record external acceptance.");
  }

  if (!pkg.structuredPaymentTerms) {
    const finalized = await finalizeDirectAgreement({
      contractId: input.contractId,
      actor: input.actor,
    });
    pkg = finalized.pkg;
  }

  const validated = validateExternalAcceptanceInput({
    acceptedBy: input.acceptedBy,
    acceptedAt: input.acceptedAt,
    method: input.method,
    evidenceNotes: input.evidenceNotes,
    clientId,
    contractId: input.contractId,
    evidenceReference: input.evidenceReference,
  });
  if (!validated.ok) {
    throw new Error(
      Object.entries(validated.errors)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
    );
  }

  const recordedAt = new Date().toISOString();
  const externalAcceptance = {
    ...validated.record,
    recordedBy: input.actor,
    recordedAt,
  };

  // Operator acknowledgment is required for document hash / package seal — not a fake client e-sign.
  let operator = pkg.operatorSignature;
  if (!operator) {
    const legalName = (input.operatorLegalName || "KXD Operator").trim();
    operator = buildTypedSignature({
      legalName,
      title: input.operatorTitle || "Operator",
      entityName: "Kreate by Design",
      email: input.operatorEmail || input.actor,
      typedAcknowledgment: legalName,
      authorityConfirmed: true,
      electronicRecordsConsent: true,
      actorRole: "kxd-operator",
      documentHash: computeDocumentHash({
        contractId: input.contractId,
        contractBody: String(contract.body ?? ""),
        acceptedSnapshotHash: "direct-agreement-external",
        paymentTermsHash: hashPaymentTerms(pkg.structuredPaymentTerms!),
        version: Number(contract.revisionNumber ?? 1) || 1,
      }),
    });
  }

  const documentHash = operator.documentHash;
  const certificate = {
    agreementId: `AGR-${input.contractId}-1`,
    proposalId: 0,
    proposalNumber: pkg.structuredPaymentTerms!.sourceProposalNumber,
    proposalVersion: pkg.structuredPaymentTerms!.sourceProposalVersion,
    contractId: input.contractId,
    contractVersion: Number(contract.revisionNumber ?? 1) || 1,
    documentHash,
    kxdSignerName: operator.legalName,
    kxdSignedAt: operator.signedAt,
    clientSignerName: externalAcceptance.acceptedBy,
    clientSignedAt: externalAcceptance.acceptedAt,
    consentVersion: operator.consentDisclosureVersion,
    verificationId: newLifecycleId("ext"),
    sealedAt: recordedAt,
    acceptanceMode: "external-acceptance" as const,
  };

  // Placeholder client signature slot remains null — external acceptance is separate.
  pkg = {
    ...pkg,
    operatorSignature: operator,
    clientSignature: null,
    externalAcceptance,
    executedCertificate: certificate,
    commercialStatus: "accepted",
    commercialSource: "direct-agreement",
  };
  pkg = appendAudit(pkg, {
    actor: input.actor,
    action: "direct-agreement.external-acceptance-recorded",
    toStatus: "accepted",
    reason: `Externally recorded acceptance via ${externalAcceptance.method} — not electronic signature`,
  });

  const daTerms = parseStoredDirectAgreementTerms(contract.directAgreementTerms);
  if (!daTerms) throw new Error("Direct Agreement terms are missing or invalid.");
  const documentBody = composeDirectAgreementDocumentBody({
    body: String(contract.body ?? ""),
    terms: daTerms,
  });

  pkg = await generateAndFileExecutedPackage({
    contractId: input.contractId,
    proposalId: null,
    clientId,
    proposalNumber: pkg.structuredPaymentTerms!.sourceProposalNumber,
    contractTitle: String(contract.title ?? ""),
    contractBody: documentBody,
    canonical: null,
    certificate,
    operator,
    // Minimal typed evidence object for package APIs that require the shape —
    // labeled clearly as not an e-sign; PDF uses externalAcceptance block instead.
    client: {
      legalName: externalAcceptance.acceptedBy,
      title: "External acceptance (not e-sign)",
      entityName: String(contract.publicTitle ?? contract.title ?? "Client"),
      email: "",
      typedAcknowledgment: "EXTERNAL_ACCEPTANCE_NOT_ELECTRONIC_SIGNATURE",
      authorityConfirmed: false,
      electronicRecordsConsent: false,
      consentDisclosureVersion: "external-acceptance-v1",
      consentText:
        "Acceptance was recorded from external evidence and was not completed through KXD electronic signing.",
      signedAt: externalAcceptance.acceptedAt,
      ipAddress: null,
      userAgent: null,
      actorRole: "client",
      documentHash,
      signatureHash: stableJsonHash({
        mode: "external-acceptance",
        acceptedBy: externalAcceptance.acceptedBy,
        acceptedAt: externalAcceptance.acceptedAt,
        method: externalAcceptance.method,
      }),
    },
    terms: pkg.structuredPaymentTerms!,
    pkg,
    externalAcceptance,
  });

  await payload.update({
    collection: CONTRACTS as never,
    id: input.contractId,
    data: {
      status: "executed",
      signedAt: externalAcceptance.acceptedAt,
      signerName: externalAcceptance.acceptedBy,
      lifecyclePackage: {
        ...pkg,
        commercialStatus: "payment-pending",
      },
    } as never,
    overrideAccess: true,
  });

  await publishClientActivity(
    {
      clientId,
      sourceModule: "Sales",
      sourceType: "contract",
      sourceId: input.contractId,
      eventType: "direct-agreement.external-acceptance-recorded",
      title: `External acceptance recorded — ${String(contract.title)}`,
      summary: `Accepted by ${externalAcceptance.acceptedBy} via ${externalAcceptance.method} on ${externalAcceptance.acceptedAt}. Not an electronic signature.`,
      author: input.actor,
      metadata: {
        acceptanceMode: "external-acceptance",
        method: externalAcceptance.method,
        contractId: input.contractId,
      },
      internalOnly: true,
    },
    payload,
  );

  return { pkg: { ...pkg, commercialStatus: "payment-pending" } };
}

export async function recordPaymentAuthorization(input: {
  contractId: number;
  actor: string;
  payload: Record<string, unknown>;
}): Promise<{ pkg: ContractLifecyclePackage }> {
  const payload = await payloadClient();
  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: input.contractId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  const clientId = asId(contract.client);
  if (!clientId) throw new Error("Client relationship required.");

  const validated = validatePaymentAuthorizationInput(input.payload);
  if (!validated.ok) {
    throw new Error(
      Object.entries(validated.errors)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
    );
  }

  let pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  const recordedAt = new Date().toISOString();
  const authorization = {
    ...validated.record,
    recordedBy: input.actor,
    recordedAt,
  };

  pkg = {
    ...pkg,
    paymentAuthorization: authorization,
    paymentReferences: {
      stripeCustomerId: authorization.stripeCustomerId ?? null,
      stripeInvoiceId: authorization.stripeInvoiceId ?? null,
      stripePaymentIntentId: authorization.stripePaymentIntentId ?? null,
      stripeChargeId: authorization.stripeChargeId ?? null,
      hostedInvoiceUrl: authorization.hostedInvoiceUrl ?? null,
      receiptUrl: authorization.receiptUrl ?? null,
      paymentStatus: authorization.paymentStatus ?? null,
      linkedAt: recordedAt,
      linkedBy: input.actor,
    },
  };
  pkg = appendAudit(pkg, {
    actor: input.actor,
    action: "direct-agreement.authorization-recorded",
    reason: "Payment authorization metadata recorded (no card charge)",
  });

  await payload.update({
    collection: CONTRACTS as never,
    id: input.contractId,
    data: { lifecyclePackage: pkg } as never,
    overrideAccess: true,
  });

  await publishClientActivity(
    {
      clientId,
      sourceModule: "Sales",
      sourceType: "contract",
      sourceId: input.contractId,
      eventType: "direct-agreement.authorization-recorded",
      title: `Payment authorization recorded — ${String(contract.title)}`,
      summary: `Authorized by ${authorization.authorizedBy}. Amount ${(authorization.amountAuthorizedCents / 100).toFixed(2)} USD. No raw card data stored.`,
      author: input.actor,
      metadata: {
        amountAuthorizedCents: authorization.amountAuthorizedCents,
        cardBrand: authorization.cardBrand,
        cardLast4: authorization.cardLast4,
        stripePaymentMethodId: authorization.stripePaymentMethodId,
      },
      internalOnly: true,
    },
    payload,
  );

  return { pkg };
}

export async function linkPaymentReferences(input: {
  contractId: number;
  actor: string;
  references: NonNullable<ContractLifecyclePackage["paymentReferences"]>;
  markPaid?: boolean;
}): Promise<{ pkg: ContractLifecyclePackage }> {
  const payload = await payloadClient();
  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: input.contractId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  const clientId = asId(contract.client);
  if (!clientId) throw new Error("Client relationship required.");

  let pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  pkg = {
    ...pkg,
    paymentReferences: {
      ...pkg.paymentReferences,
      ...input.references,
      linkedAt: new Date().toISOString(),
      linkedBy: input.actor,
    },
    commercialStatus: input.markPaid
      ? "paid"
      : pkg.commercialStatus === "accepted"
        ? "payment-pending"
        : pkg.commercialStatus,
  };
  pkg = appendAudit(pkg, {
    actor: input.actor,
    action: input.markPaid
      ? "direct-agreement.payment-recorded"
      : "direct-agreement.payment-references-linked",
  });

  await payload.update({
    collection: CONTRACTS as never,
    id: input.contractId,
    data: { lifecyclePackage: pkg } as never,
    overrideAccess: true,
  });

  await publishClientActivity(
    {
      clientId,
      sourceModule: "Sales",
      sourceType: "contract",
      sourceId: input.contractId,
      eventType: input.markPaid
        ? "direct-agreement.payment-recorded"
        : "direct-agreement.payment-references-linked",
      title: input.markPaid
        ? `Payment recorded — ${String(contract.title)}`
        : `Payment references linked — ${String(contract.title)}`,
      summary: "Safe Stripe metadata only. No live charge performed by KXD OS.",
      author: input.actor,
      metadata: { ...(input.references as Record<string, unknown>) },
      internalOnly: true,
    },
    payload,
  );

  return { pkg };
}

export async function activateDirectAgreementService(input: {
  contractId: number;
  actor: string;
}): Promise<{ pkg: ContractLifecyclePackage }> {
  const payload = await payloadClient();
  const contract = (await payload.findByID({
    collection: CONTRACTS as never,
    id: input.contractId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
  const clientId = asId(contract.client);
  if (!clientId) throw new Error("Client relationship required.");

  let pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  if (!pkg.executedCertificate && !pkg.externalAcceptance && !pkg.clientSignature) {
    throw new Error("Agreement must be accepted before service activation.");
  }
  if (pkg.commercialStatus !== "paid" && pkg.commercialStatus !== "payment-pending" && pkg.commercialStatus !== "accepted") {
    // Allow activation after acceptance when prepaid ops confirms separately —
    // still require explicit operator action; do not auto-activate on finalize.
  }

  pkg = {
    ...pkg,
    commercialStatus: "active",
  };
  pkg = appendAudit(pkg, {
    actor: input.actor,
    action: "direct-agreement.service-activated",
    toStatus: "active",
    reason: "Operator-controlled activation — separate from acceptance and payment",
  });

  await payload.update({
    collection: CONTRACTS as never,
    id: input.contractId,
    data: { lifecyclePackage: pkg } as never,
    overrideAccess: true,
  });

  await publishClientActivity(
    {
      clientId,
      sourceModule: "Sales",
      sourceType: "contract",
      sourceId: input.contractId,
      eventType: "direct-agreement.service-activated",
      title: `Service activated — ${String(contract.title)}`,
      summary: "Operator activated the Direct Agreement service period.",
      author: input.actor,
      internalOnly: true,
    },
    payload,
  );

  return { pkg };
}
