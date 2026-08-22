/**
 * Portal commercial loader — client-safe projection from authoritative KXD OS records.
 * billingPlan.obligations are authoritative for payment schedule and paid state.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { parseStoredDirectAgreementTerms } from "@/lib/direct-agreement/validate";
import { formatCents } from "@/lib/proposal-builder/money";
import type { CanonicalProposal } from "@/lib/proposal-builder/types";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import type {
  ContractLifecyclePackage,
  ExecutionCertificate,
  InvoiceObligation,
} from "@/lib/proposal-lifecycle/types";
import { formatPortalEngagementStatus } from "@/lib/portal/active-engagement/presentation";
import {
  isBillingPlanInitialObligationPaid,
} from "@/lib/client-command/commercial/payment-status-display";
import {
  mapClientSafeCommercialDocument,
  portalCommercialDocumentDownloadHref,
} from "./client-safe-documents";
import {
  formatPortalAgreementStatusLabel,
  formatPortalCommercialDate,
  formatPortalObligationStatusLabel,
} from "./presentation";
import type {
  PortalCommercialCollaboration,
  PortalCommercialDocument,
  PortalCommercialView,
} from "./types";

type AnyDoc = Record<string, unknown> & { id: number };

const QUALIFYING_COMMERCIAL_STATUSES = new Set([
  "active",
  "paid",
  "accepted",
  "executed",
  "payment-pending",
]);

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function pickPrimaryContract(docs: AnyDoc[]): AnyDoc | null {
  if (!docs.length) return null;
  const rank = (d: AnyDoc) => {
    const pkg = normalizeLifecyclePackage(d.lifecyclePackage);
    const st = String(pkg.commercialStatus ?? d.status ?? "");
    if (st === "active") return 0;
    if (st === "paid") return 1;
    if (st === "accepted" || st === "payment-pending") return 2;
    if (st === "executed") return 3;
    if (st === "sent" || st === "finalized") return 4;
    return 10;
  };
  return [...docs].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

function unavailable(title: string, description: string): PortalCommercialView {
  return { kind: "unavailable", title, description };
}

function resolveCertificate(pkg: ContractLifecyclePackage): ExecutionCertificate | null {
  return pkg.executedCertificate ?? null;
}

function resolveExecutedDateLabel(
  certificate: ExecutionCertificate | null,
  pkg: ContractLifecyclePackage,
): string | null {
  const fromCert = certificate?.sealedAt ?? certificate?.clientSignedAt ?? null;
  if (fromCert) return formatPortalCommercialDate(fromCert);
  const clientSigned = pkg.clientSignature?.signedAt ?? null;
  return formatPortalCommercialDate(clientSigned);
}

function resolveSignerNames(
  certificate: ExecutionCertificate | null,
  pkg: ContractLifecyclePackage,
): { clientSignerName: string | null; kxdSignerName: string | null } {
  return {
    clientSignerName:
      certificate?.clientSignerName?.trim() ||
      pkg.clientSignature?.legalName?.trim() ||
      null,
    kxdSignerName:
      certificate?.kxdSignerName?.trim() ||
      pkg.operatorSignature?.legalName?.trim() ||
      null,
  };
}

function buildScopeFromAcceptedSnapshot(
  accepted: CanonicalProposal | null,
): {
  proposalReference: string | null;
  summary: string | null;
  deliverables: string[];
} {
  if (!accepted) {
    return { proposalReference: null, summary: null, deliverables: [] };
  }

  const proposalReference = accepted.proposalNumber
    ? `Proposal ${accepted.proposalNumber}`
    : accepted.title?.trim() || null;

  const summary =
    accepted.scopeGroups
      .map((g) => {
        const org = g.organizationName ? ` (${g.organizationName})` : "";
        return `${g.title}${org}`;
      })
      .join("; ")
      .trim() || accepted.title?.trim() || null;

  const deliverables = accepted.scopeGroups.flatMap((g) =>
    g.deliverables.map((d) => {
      const prefix = g.title ? `${g.title}: ` : "";
      return `${prefix}${d.title}`.trim();
    }),
  );

  return { proposalReference, summary, deliverables };
}

function obligationLabel(ob: InvoiceObligation): string {
  const label = ob.label?.trim();
  if (label) return label;
  const trigger = ob.trigger?.trim();
  if (trigger) return trigger;
  switch (ob.kind) {
    case "initial":
      return "Initial payment";
    case "final":
      return "Final payment";
    case "milestone":
      return "Milestone payment";
    default:
      return "Payment";
  }
}

function resolveObligationReceiptHref(ob: InvoiceObligation): string | null {
  const receipt = ob.paymentReceipt;
  if (!receipt || receipt.status !== "paid") return null;
  // External payments have no client receipt URL — omit.
  return null;
}

function resolveInitialObligationReceiptFromPkg(
  pkg: ContractLifecyclePackage,
): string | null {
  const refs = pkg.paymentReferences;
  if (!refs) return null;
  if (refs.receiptUrl?.trim()) return refs.receiptUrl.trim();
  if (refs.paymentStatus === "paid" && refs.hostedInvoiceUrl?.trim()) {
    return refs.hostedInvoiceUrl.trim();
  }
  return null;
}

function buildPaymentSchedule(
  obligations: InvoiceObligation[],
  pkg: ContractLifecyclePackage,
) {
  const schedule = obligations.map((ob) => {
    let receiptHref = resolveObligationReceiptHref(ob);
    if (!receiptHref && ob.kind === "initial" && ob.status === "paid") {
      receiptHref = resolveInitialObligationReceiptFromPkg(pkg);
    }
    return {
      id: ob.id,
      label: obligationLabel(ob),
      amountLabel: formatCents(ob.amountCents),
      statusLabel: formatPortalObligationStatusLabel(ob.status),
      dueDateLabel: ob.dueDate ? formatPortalCommercialDate(ob.dueDate) : null,
      receiptHref,
    };
  });

  const totalCents = obligations.reduce((sum, ob) => sum + ob.amountCents, 0);
  const paidCents = obligations
    .filter((ob) => ob.status === "paid")
    .reduce((sum, ob) => sum + ob.amountCents, 0);
  const remainingCents = Math.max(0, totalCents - paidCents);

  return {
    totalLabel: formatCents(totalCents),
    paidLabel: formatCents(paidCents),
    remainingLabel: formatCents(remainingCents),
    schedule,
  };
}

function pickExecutedAndCertificateDocuments(
  documents: PortalCommercialDocument[],
): {
  executedAgreement: PortalCommercialDocument | null;
  certificate: PortalCommercialDocument | null;
  proposalDocument: PortalCommercialDocument | null;
  remainder: PortalCommercialDocument[];
} {
  const executedAgreement =
    documents.find((d) => d.kindLabel === "Agreement" && d.title.toLowerCase().includes("executed")) ??
    documents.find((d) => d.kindLabel === "Agreement") ??
    null;
  const certificate = documents.find((d) => d.kindLabel === "Execution certificate") ?? null;
  const proposalDocument = documents.find((d) => d.kindLabel === "Proposal") ?? null;

  const pickedIds = new Set(
    [executedAgreement, certificate, proposalDocument]
      .filter(Boolean)
      .map((d) => d!.id),
  );

  return {
    executedAgreement,
    certificate,
    proposalDocument,
    remainder: documents.filter((d) => !pickedIds.has(d.id)),
  };
}

function resolveCollaborationSurface(
  enabledPortalModules: string[] | undefined,
): PortalCommercialCollaboration | null {
  const modules = enabledPortalModules ?? [];
  if (modules.includes("website-review")) {
    return {
      label: "Website Review",
      href: "/portal/website-review",
      detail: "Share feedback, uploads, and review notes for your website project.",
    };
  }
  if (modules.includes("website-workspace")) {
    return {
      label: "Website workspace",
      href: "/portal/website-workspace",
      detail: "Collaborate on website deliverables and project materials.",
    };
  }
  if (modules.includes("projects")) {
    return {
      label: "Projects",
      href: "/portal/projects",
      detail: "Track active project work and deliverables.",
    };
  }
  if (modules.includes("requests")) {
    return {
      label: "Requests",
      href: "/portal/requests",
      detail: "Submit requests and follow active work.",
    };
  }
  return null;
}

async function loadCommercialDocumentsForClient(
  clientId: number,
  contractId: number | null,
): Promise<PortalCommercialDocument[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      collection: "commercial-documents" as never,
      where: { client: { equals: clientId } },
      sort: "-generatedAt",
      limit: 80,
      depth: 1,
      overrideAccess: true,
    });

    const rows: PortalCommercialDocument[] = [];
    for (const doc of result.docs as AnyDoc[]) {
      const kind = String(doc.kind ?? "document");
      const mapped = mapClientSafeCommercialDocument({
        id: Number(doc.id),
        kind,
        title: String(doc.title ?? "Document"),
      });
      if (!mapped) continue;
      const docContractId = relId(doc.contract);
      if (contractId != null && docContractId != null && docContractId !== contractId) {
        continue;
      }
      rows.push(mapped);
    }
    return rows;
  } catch {
    return [];
  }
}

async function loadAcceptedProposalSnapshot(
  proposalId: number | null,
): Promise<CanonicalProposal | null> {
  if (!proposalId) return null;
  const payload = await getPayload({ config });
  try {
    const proposal = (await payload.findByID({
      collection: "proposals" as never,
      id: proposalId,
      depth: 0,
      overrideAccess: true,
    })) as { acceptedSnapshot?: CanonicalProposal | null };
    const snap = proposal.acceptedSnapshot;
    return snap && typeof snap === "object" ? (snap as CanonicalProposal) : null;
  } catch {
    return null;
  }
}

/**
 * Load client-safe commercial workspace for portal Agreement surface.
 */
export async function loadPortalCommercialForClient(
  clientId: number,
  options?: { enabledPortalModules?: string[] },
): Promise<PortalCommercialView> {
  if (!clientId || !Number.isFinite(clientId)) {
    return unavailable("Agreement unavailable", "No commercial records are available yet.");
  }

  const payload = await getPayload({ config });
  let contracts: AnyDoc[] = [];
  try {
    const result = await payload.find({
      collection: "contracts" as never,
      where: { client: { equals: clientId } },
      sort: "-updatedAt",
      limit: 50,
      depth: 0,
      overrideAccess: true,
    });
    contracts = result.docs as AnyDoc[];
  } catch {
    return unavailable(
      "Agreement unavailable",
      "Commercial records could not be loaded for this account.",
    );
  }

  const primaryDoc = pickPrimaryContract(contracts);
  if (!primaryDoc) {
    return unavailable(
      "Agreement unavailable",
      "Your agreement and billing details will appear here after your engagement is finalized.",
    );
  }

  const pkg = normalizeLifecyclePackage(primaryDoc.lifecyclePackage) as ContractLifecyclePackage;
  const commercialStatus = String(pkg.commercialStatus ?? primaryDoc.status ?? "").trim();
  const contractStatus = String(primaryDoc.status ?? "").trim();

  const qualifies =
    QUALIFYING_COMMERCIAL_STATUSES.has(commercialStatus) ||
    QUALIFYING_COMMERCIAL_STATUSES.has(contractStatus) ||
    contractStatus === "executed";

  if (!qualifies) {
    return unavailable(
      "Agreement unavailable",
      "Your agreement and billing details will appear here after your engagement is finalized.",
    );
  }

  const billingPlan = pkg.billingPlan;
  const obligations = billingPlan?.obligations ?? [];
  if (!billingPlan || obligations.length === 0) {
    return unavailable(
      "Agreement unavailable",
      "Payment schedule details are being prepared. Your operator will confirm when billing is ready.",
    );
  }

  const contractId = Number(primaryDoc.id);
  const proposalId = relId(primaryDoc.proposal);
  const title = String(primaryDoc.title ?? "Engagement").trim() || "Engagement";
  const certificate = resolveCertificate(pkg);
  const signers = resolveSignerNames(certificate, pkg);

  const acceptedSnapshot = await loadAcceptedProposalSnapshot(proposalId);
  const scope = buildScopeFromAcceptedSnapshot(acceptedSnapshot);

  const documents = await loadCommercialDocumentsForClient(clientId, contractId);
  const docPick = pickExecutedAndCertificateDocuments(documents);

  const agreementDocuments: PortalCommercialDocument[] = [];
  if (docPick.executedAgreement) agreementDocuments.push(docPick.executedAgreement);
  if (docPick.certificate) agreementDocuments.push(docPick.certificate);
  for (const doc of docPick.remainder) agreementDocuments.push(doc);

  const payments = buildPaymentSchedule(obligations, pkg);

  const paymentStatus = isBillingPlanInitialObligationPaid(pkg) ? "paid" : null;
  const statusLabel = formatPortalEngagementStatus({
    commercialStatus,
    contractStatus,
    paymentStatus,
  });

  const totalLabel =
    billingPlan.oneTimeTotalCents > 0
      ? formatCents(billingPlan.oneTimeTotalCents)
      : payments.totalLabel;

  return {
    kind: "ready",
    engagement: {
      title,
      statusLabel,
      totalLabel,
    },
    agreement: {
      title,
      statusLabel: formatPortalAgreementStatusLabel({
        contractStatus,
        commercialStatus,
      }),
      executedDateLabel: resolveExecutedDateLabel(certificate, pkg),
      clientSignerName: signers.clientSignerName,
      kxdSignerName: signers.kxdSignerName,
    },
    scope: {
      proposalReference: scope.proposalReference,
      summary: scope.summary,
      deliverables: scope.deliverables,
      proposalDocument: docPick.proposalDocument,
    },
    payments,
    documents: agreementDocuments,
    collaboration: resolveCollaborationSurface(options?.enabledPortalModules),
  };
}

export async function resolvePortalCommercialNavAvailable(clientId: number): Promise<boolean> {
  const view = await loadPortalCommercialForClient(clientId);
  return view.kind === "ready";
}

export async function verifyPortalCommercialDocumentAccess(input: {
  documentId: number;
  clientId: number;
}): Promise<{ ok: true; storageKey: string; storageProvider?: string | null; mimeType?: string; title?: string; contentHash?: string; kind?: string } | { ok: false }> {
  const payload = await getPayload({ config });
  try {
    const doc = (await payload.findByID({
      collection: "commercial-documents" as never,
      id: input.documentId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;

    const docClientId = relId(doc.client);
    if (docClientId !== input.clientId) return { ok: false };

    const kind = String(doc.kind ?? "");
    if (!mapClientSafeCommercialDocument({
      id: input.documentId,
      kind,
      title: String(doc.title ?? ""),
    })) {
      return { ok: false };
    }

    const storageKey = String(doc.storageKey ?? "");
    if (!storageKey) return { ok: false };

    return {
      ok: true,
      storageKey,
      storageProvider: doc.storageProvider as string | null | undefined,
      mimeType: doc.mimeType ? String(doc.mimeType) : undefined,
      title: doc.title ? String(doc.title) : undefined,
      contentHash: doc.contentHash ? String(doc.contentHash) : undefined,
      kind,
    };
  } catch {
    return { ok: false };
  }
}

export { portalCommercialDocumentDownloadHref };
