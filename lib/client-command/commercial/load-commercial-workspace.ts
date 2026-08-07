import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import { parseStoredDirectAgreementTerms } from "@/lib/direct-agreement/validate";
import { formatCents } from "@/lib/proposal-builder/money";
import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";
import type { DirectAgreementTerms } from "@/lib/direct-agreement/types";
import type { WorkspaceTimelineEvent } from "../workspace-types";
import type { WorkspaceInvoiceRow } from "../workspace-types";
import {
  buildAgreementRow,
  buildOverviewFromPrimary,
  documentKindLabel,
  formatCommercialStatus,
} from "./map-agreement";
import {
  mapAuditEventsToCommercial,
  mapWorkspaceTimelineToCommercial,
  mergeCommercialTimeline,
} from "./commercial-timeline";
import type {
  ClientCommercialWorkspaceSnapshot,
  CommercialAuthorizationRow,
  CommercialDocumentRow,
  CommercialExternalPaymentEligibleAgreement,
  CommercialInvoiceRow,
  CommercialPaymentRow,
  CommercialReceiptRow,
} from "./types";
import { commercialAgreementHref } from "./sections";
import {
  isEligibleForExternalPaymentRecording,
  obligationAmountCents,
} from "@/lib/direct-agreement/external-payment";

type AnyDoc = Record<string, unknown> & { id: number };

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export async function loadClientCommercialDocuments(
  clientId: number,
): Promise<CommercialDocumentRow[]> {
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

    return (result.docs as AnyDoc[]).map((doc) => {
      const kind = String(doc.kind ?? "document");
      const contractId = relId(doc.contract);
      const agreementTitle =
        typeof doc.contract === "object" && doc.contract && "title" in doc.contract
          ? String((doc.contract as { title?: string }).title ?? "")
          : null;
      return {
        id: Number(doc.id),
        kind,
        kindLabel: documentKindLabel(kind),
        title: String(doc.title ?? agreementTitle ?? documentKindLabel(kind)),
        status: String(doc.executionStatus ?? doc.status ?? "filed"),
        version: Number(doc.version ?? 1),
        generatedAt: doc.generatedAt ? String(doc.generatedAt) : null,
        contractId,
        agreementTitle: agreementTitle || null,
        downloadHref: `/api/admin/commercial-documents/${doc.id}/download`,
        previewHref: `/api/admin/commercial-documents/${doc.id}/download?disposition=inline`,
      };
    });
  } catch {
    return [];
  }
}

async function loadClientContractsRaw(clientId: number): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      collection: "contracts" as never,
      where: { client: { equals: clientId } },
      sort: "-updatedAt",
      limit: 50,
      depth: 0,
      overrideAccess: true,
    });
    return result.docs as AnyDoc[];
  } catch {
    return [];
  }
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

export async function loadClientCommercialWorkspace(input: {
  clientId: number;
  timelineEvents: WorkspaceTimelineEvent[];
  workspaceInvoices: WorkspaceInvoiceRow[];
}): Promise<ClientCommercialWorkspaceSnapshot> {
  const { clientId } = input;
  const [contracts, documents] = await Promise.all([
    loadClientContractsRaw(clientId),
    loadClientCommercialDocuments(clientId),
  ]);

  const agreements = contracts.map((doc) => {
    const pkg = normalizeLifecyclePackage(doc.lifecyclePackage);
    const daTerms = parseStoredDirectAgreementTerms(doc.directAgreementTerms);
    return buildAgreementRow({
      clientId,
      contractId: Number(doc.id),
      title: String(doc.title ?? `Agreement ${doc.id}`),
      contractStatus: String(doc.status ?? "draft"),
      agreementSource: doc.agreementSource ? String(doc.agreementSource) : null,
      contractType: doc.contractType ? String(doc.contractType) : null,
      createdAt: doc.createdAt ? String(doc.createdAt) : null,
      proposalId: relId(doc.proposal),
      pkg,
      daTerms,
    });
  });

  const primaryDoc = pickPrimaryContract(contracts);
  const primaryPkg = primaryDoc
    ? normalizeLifecyclePackage(primaryDoc.lifecyclePackage)
    : null;
  const primaryDa = primaryDoc
    ? parseStoredDirectAgreementTerms(primaryDoc.directAgreementTerms)
    : null;
  const primaryAgreement =
    agreements.find((a) => a.id === primaryDoc?.id) ?? agreements[0] ?? null;

  const payments: CommercialPaymentRow[] = [];
  const authorizations: CommercialAuthorizationRow[] = [];
  const invoices: CommercialInvoiceRow[] = [];
  const receipts: CommercialReceiptRow[] = [];
  const externalPaymentEligibleAgreements: CommercialExternalPaymentEligibleAgreement[] = [];
  const auditTimeline = [];

  for (const doc of contracts) {
    const pkg = normalizeLifecyclePackage(doc.lifecyclePackage) as ContractLifecyclePackage;
    const title = String(doc.title ?? `Agreement ${doc.id}`);
    const contractId = Number(doc.id);
    const terms = pkg.structuredPaymentTerms;
    const da = parseStoredDirectAgreementTerms(doc.directAgreementTerms) as DirectAgreementTerms | null;
    const amountCents =
      pkg.paymentReferences?.amountCents ??
      da?.oneTimeAmountCents ??
      terms?.oneTimeTotalCents ??
      null;
    const amountLabel =
      amountCents != null && amountCents > 0 ? formatCents(amountCents as never) : "—";

    if (
      String(doc.agreementSource ?? "") === "direct-agreement" &&
      isEligibleForExternalPaymentRecording(pkg) &&
      ["accepted", "payment-pending"].includes(String(pkg.commercialStatus ?? ""))
    ) {
      const obligation =
        obligationAmountCents({
          daTerms: da,
          pkg,
          projectAmountDollars:
            doc.projectAmount != null ? Number(doc.projectAmount) : null,
        }) ?? 0;
      if (obligation > 0) {
        externalPaymentEligibleAgreements.push({
          agreementId: contractId,
          title,
          commercialStatus: String(pkg.commercialStatus ?? ""),
          obligationAmountCents: obligation,
          currency: da?.currency ?? "USD",
          href: commercialAgreementHref(clientId, contractId),
        });
      }
    }

    if (pkg.paymentReferences || pkg.commercialStatus === "paid" || pkg.commercialStatus === "active") {
      payments.push({
        id: `pay-${contractId}`,
        agreementId: contractId,
        agreementTitle: title,
        amountLabel,
        paymentStatus: String(
          pkg.paymentReferences?.paymentStatus ??
            (pkg.commercialStatus === "paid" || pkg.commercialStatus === "active"
              ? "paid"
              : pkg.commercialStatus ?? "pending"),
        ),
        stripeCustomerId: pkg.paymentReferences?.stripeCustomerId ?? pkg.paymentAuthorization?.stripeCustomerId ?? null,
        stripeInvoiceId: pkg.paymentReferences?.stripeInvoiceId ?? null,
        stripePaymentIntentId: pkg.paymentReferences?.stripePaymentIntentId ?? null,
        stripeChargeId: pkg.paymentReferences?.stripeChargeId ?? null,
        receiptUrl: pkg.paymentReferences?.receiptUrl ?? null,
        hostedInvoiceUrl: pkg.paymentReferences?.hostedInvoiceUrl ?? null,
        cardBrand: pkg.paymentAuthorization?.cardBrand ?? null,
        cardLast4: pkg.paymentAuthorization?.cardLast4 ?? null,
        linkedAt: pkg.paymentReferences?.linkedAt ?? null,
        source: pkg.paymentReferences?.source ?? null,
        livemode:
          pkg.paymentReferences?.livemode === true
            ? true
            : pkg.paymentReferences?.livemode === false
              ? false
              : null,
        paidAt: pkg.paymentReferences?.paidAt ?? null,
        operatorNote: pkg.paymentReferences?.operatorNote ?? null,
        idempotencyKey: pkg.paymentReferences?.idempotencyKey ?? null,
      });
    }

    if (pkg.paymentAuthorization) {
      const auth = pkg.paymentAuthorization;
      authorizations.push({
        id: `auth-${contractId}`,
        agreementId: contractId,
        agreementTitle: title,
        authorizedBy: auth.authorizedBy || "—",
        method: String(auth.authorizationMethod ?? auth.authorizationType ?? "manual"),
        authorizedAt: auth.authorizedAt ?? null,
        amountLabel:
          auth.amountAuthorizedCents != null
            ? formatCents(auth.amountAuthorizedCents as never)
            : amountLabel,
        notes: auth.evidenceNotes ?? null,
        relatedPaymentStatus: pkg.paymentReferences?.paymentStatus ?? null,
        cardBrand: auth.cardBrand ?? null,
        cardLast4: auth.cardLast4 ?? null,
      });
    }

    for (const ob of pkg.billingPlan?.obligations ?? []) {
      invoices.push({
        id: `ob-${contractId}-${ob.id}`,
        title: ob.trigger || `Obligation · ${title}`,
        amountLabel: formatCents(ob.amountCents as never),
        status: ob.status,
        date: ob.paidAt ?? null,
        agreementId: contractId,
        agreementTitle: title,
        stripeInvoiceId: ob.stripeDraftInvoiceId ?? null,
        hostedInvoiceUrl: null,
        source: "obligation",
      });
    }

    if (pkg.paymentReferences?.stripeInvoiceId || pkg.paymentReferences?.hostedInvoiceUrl) {
      invoices.push({
        id: `inv-ref-${contractId}`,
        title: `Invoice · ${title}`,
        amountLabel,
        status: String(pkg.paymentReferences.paymentStatus ?? "linked"),
        date: pkg.paymentReferences.linkedAt ?? null,
        agreementId: contractId,
        agreementTitle: title,
        stripeInvoiceId: pkg.paymentReferences.stripeInvoiceId ?? null,
        hostedInvoiceUrl: pkg.paymentReferences.hostedInvoiceUrl ?? null,
        source: "payment-reference",
      });
    }

    if (
      pkg.paymentReferences?.receiptUrl ||
      pkg.paymentReferences?.stripeChargeId ||
      (pkg.paymentReferences?.paymentStatus === "paid" &&
        pkg.paymentReferences?.hostedInvoiceUrl)
    ) {
      receipts.push({
        id: `rcpt-${contractId}`,
        title: `Receipt · ${title}`,
        amountLabel,
        date: pkg.paymentReferences.paidAt ?? pkg.paymentReferences.linkedAt ?? null,
        agreementId: contractId,
        agreementTitle: title,
        receiptUrl:
          pkg.paymentReferences.receiptUrl ??
          pkg.paymentReferences.hostedInvoiceUrl ??
          null,
        stripeChargeId: pkg.paymentReferences.stripeChargeId ?? null,
      });
    }

    auditTimeline.push(...mapAuditEventsToCommercial(clientId, contractId, pkg.auditEvents));
  }

  for (const inv of input.workspaceInvoices) {
    invoices.push({
      id: `ws-inv-${inv.source}-${inv.id}`,
      title: inv.title,
      amountLabel: inv.amount != null ? formatCents(Math.round(inv.amount * 100) as never) : "—",
      status: inv.status,
      date: inv.date,
      agreementId: null,
      agreementTitle: null,
      stripeInvoiceId: null,
      hostedInvoiceUrl: null,
      source: "workspace-invoice",
    });
  }

  const timeline = mergeCommercialTimeline([
    ...mapWorkspaceTimelineToCommercial(input.timelineEvents),
    ...auditTimeline,
  ]);

  const documentKinds = [...new Set(documents.map((d) => d.kindLabel))];

  const overview = buildOverviewFromPrimary({
    clientId,
    agreement: primaryAgreement,
    pkg: primaryPkg,
    daTerms: primaryDa,
    documentKinds,
    lastActivityLabel: timeline[0]
      ? `${timeline[0].title}${timeline[0].occurredAt ? ` · ${timeline[0].occurredAt.slice(0, 10)}` : ""}`
      : null,
  });

  // Ensure agreement hrefs are client-scoped commercial routes
  for (const a of agreements) {
    a.href = commercialAgreementHref(clientId, a.id);
  }
  if (overview.agreementId) {
    overview.agreementHref = commercialAgreementHref(clientId, overview.agreementId);
  }

  return {
    clientId,
    overview,
    agreements,
    documents,
    payments,
    authorizations,
    invoices,
    receipts,
    timeline,
    primaryAgreementId: primaryAgreement?.id ?? null,
    externalPaymentEligibleAgreements,
  };
}

export function emptyCommercialWorkspace(clientId: number): ClientCommercialWorkspaceSnapshot {
  return {
    clientId,
    overview: {
      agreementTitle: null,
      agreementId: null,
      agreementHref: null,
      statusLabel: "None",
      paymentStatusLabel: "—",
      invoiceAmountLabel: "—",
      termStart: null,
      termEnd: null,
      hoursIncludedLabel: "—",
      hoursUsedLabel: "Not tracked yet",
      hoursRemainingLabel: "Not tracked yet",
      paymentMethodLabel: "Not on file",
      renewalLabel: "—",
      lastActivityLabel: null,
      outstandingItems: ["No agreement on file"],
      documentKindsPresent: [],
    },
    agreements: [],
    documents: [],
    payments: [],
    authorizations: [],
    invoices: [],
    receipts: [],
    timeline: [],
    primaryAgreementId: null,
    externalPaymentEligibleAgreements: [],
  };
}

/** Status label helper exported for UI. */
export { formatCommercialStatus };
