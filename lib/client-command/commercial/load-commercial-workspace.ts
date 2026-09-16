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
import {
  isEligibleForExternalPaymentRecording,
  obligationAmountCents,
} from "@/lib/direct-agreement/external-payment";
import { billingPlanBlocksAgreementLevelSettlement } from "@/lib/proposal-lifecycle/external-obligation-payment";
import { ensurePayableSurfacesOnPlan } from "@/lib/proposal-lifecycle/ensure-payable-surfaces";
import { ensurePayableSurfacesOnContract } from "@/lib/proposal-lifecycle/record-obligation-external-payment";
import {
  formatObligationStatusLabel,
  isObligationOpenForExternalPayment,
  obligationAmountPaidCents,
  obligationRemainingCents,
  sumOpenObligationRemainingCents,
} from "@/lib/proposal-lifecycle/obligation-balances";
import type {
  ClientCommercialWorkspaceSnapshot,
  CommercialAuthorizationRow,
  CommercialDocumentRow,
  CommercialExternalPaymentEligibleAgreement,
  CommercialInvoiceRow,
  CommercialObligationPaymentTarget,
  CommercialPaymentRow,
  CommercialReceiptRow,
  CommercialRecurringServiceTarget,
  CommercialStatementSnapshot,
} from "./types";
import { commercialAgreementHref } from "./sections";
import { buildLiveAccountStatement } from "./build-account-statement";

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
  clientName?: string | null;
  clientSlug?: string | null;
  contactName?: string | null;
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
  const obligationPaymentTargets: CommercialObligationPaymentTarget[] = [];
  const recurringServiceTargets: CommercialRecurringServiceTarget[] = [];
  const auditTimeline = [];

  for (const doc of contracts) {
    // Materialize ancillary payables from accepted terms (idempotent; no Stripe).
    // Prefer this over display-only hydrate so obligation IDs remain durable.
    let pkg = normalizeLifecyclePackage(doc.lifecyclePackage) as ContractLifecyclePackage;
    if (pkg.billingPlan) {
      try {
        const materialized = await ensurePayableSurfacesOnContract({
          contractId: Number(doc.id),
          actor: "system:commercial-workspace",
        });
        pkg = materialized.pkg;
      } catch {
        const plan = pkg.billingPlan;
        if (plan) {
          pkg = {
            ...pkg,
            billingPlan: ensurePayableSurfacesOnPlan(plan, pkg.structuredPaymentTerms),
          };
        }
      }
    }
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

    const openObligations = (pkg.billingPlan?.obligations ?? []).filter((ob) =>
      isObligationOpenForExternalPayment(ob),
    );
    if (openObligations.length > 0) {
      obligationPaymentTargets.push({
        agreementId: contractId,
        agreementTitle: title,
        currency: pkg.billingPlan?.currency ?? da?.currency ?? "USD",
        openObligationCount: openObligations.length,
        openRemainingCents: sumOpenObligationRemainingCents(pkg.billingPlan?.obligations ?? []),
        href: commercialAgreementHref(clientId, contractId),
      });
    }

    if (pkg.billingPlan) {
      const termsRecurring = pkg.structuredPaymentTerms?.recurring;
      const planRecurring = pkg.billingPlan.recurring;
      const amountCents =
        (termsRecurring?.amountCents && termsRecurring.amountCents > 0
          ? termsRecurring.amountCents
          : null) ??
        (planRecurring?.amountCents && planRecurring.amountCents > 0
          ? planRecurring.amountCents
          : null) ??
        (da?.monthlyAmountCents && da.monthlyAmountCents > 0 ? da.monthlyAmountCents : null);

      if (amountCents && amountCents > 0) {
        const cadence =
          termsRecurring?.cadence === "quarterly" || termsRecurring?.cadence === "annual"
            ? termsRecurring.cadence
            : planRecurring?.cadence === "quarterly" || planRecurring?.cadence === "annual"
              ? planRecurring.cadence
              : "monthly";
        const serviceTitle =
          termsRecurring?.serviceTitle?.trim() ||
          "Recurring client service";
        const includes = (termsRecurring?.includes ?? [])
          .map((item) => String(item).trim())
          .filter(Boolean);
        recurringServiceTargets.push({
          agreementId: contractId,
          agreementTitle: title,
          currency: pkg.billingPlan.currency ?? "USD",
          serviceKey: serviceTitle,
          serviceTitle,
          amountCents,
          cadence,
          billDay: 1,
          effectiveDate: termsRecurring?.startBillingDate ?? da?.serviceStartDate ?? null,
          href: commercialAgreementHref(clientId, contractId),
          isOperatorDefined: false,
          isPersistedDefinition: false,
          sourceLabel: "Accepted commercial terms",
          serviceDescription: includes.length ? includes.join("; ") : null,
          internalNotes: null,
        });
      }

      // Reuse previously registered operator service definitions (title/amount/description)
      // so subsequent periods do not require retyping.
      for (const def of pkg.operatorRecurringServices ?? []) {
        if (def.active === false) continue;
        recurringServiceTargets.push({
          agreementId: contractId,
          agreementTitle: title,
          currency: def.currency || pkg.billingPlan.currency || "USD",
          serviceKey: def.serviceKey,
          serviceTitle: def.title,
          amountCents: def.amountCents,
          cadence: def.cadence,
          billDay: def.billDay,
          effectiveDate: def.effectiveDate ?? null,
          href: commercialAgreementHref(clientId, contractId),
          isOperatorDefined: true,
          isPersistedDefinition: true,
          sourceLabel: "Saved operator recurring service (does not rewrite accepted legal terms)",
          serviceDescription: def.description ?? null,
          internalNotes: def.internalNotes ?? null,
        });
      }

      // Always offer a blank operator-defined row so amended rates (e.g. $325)
      // can be registered without rewriting historically accepted legal terms.
      recurringServiceTargets.push({
        agreementId: contractId,
        agreementTitle: title,
        currency: pkg.billingPlan.currency ?? "USD",
        serviceKey: "current-commercial-service",
        serviceTitle: "Current commercial recurring service",
        amountCents: 0,
        cadence: "monthly",
        billDay: 1,
        effectiveDate: null,
        href: commercialAgreementHref(clientId, contractId),
        isOperatorDefined: true,
        isPersistedDefinition: false,
        sourceLabel: "New operator-defined service (does not rewrite accepted legal terms)",
        serviceDescription: null,
        internalNotes: null,
      });
    }

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
          blocksAgreementLevelSettlement: billingPlanBlocksAgreementLevelSettlement(
            pkg.billingPlan,
          ),
          openObligationCount: openObligations.length,
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
      const paidCents = obligationAmountPaidCents(ob);
      const remainingCents = obligationRemainingCents(ob);
      const history =
        ob.paymentEvents?.map((event) => ({
          id: event.id,
          paymentGroupId: event.paymentGroupId,
          amountLabel: formatCents(event.amountCents as never),
          paidAt: event.paidAt,
          method: event.externalPaymentMethod,
          externalReference: event.externalReference ?? null,
          operatorNote: event.operatorNote ?? null,
          obligationLabel: ob.label,
        })) ?? [];

      // Surface obligation payment events in Payments section.
      for (const event of ob.paymentEvents ?? []) {
        payments.push({
          id: `obl-pay-${contractId}-${event.id}`,
          agreementId: contractId,
          agreementTitle: title,
          amountLabel: formatCents(event.amountCents as never),
          paymentStatus: remainingCents <= 0 && paidCents > 0 ? "paid" : "partial",
          stripeCustomerId: null,
          stripeInvoiceId: event.stripeInvoiceId ?? null,
          stripePaymentIntentId: null,
          stripeChargeId: null,
          receiptUrl: null,
          hostedInvoiceUrl: null,
          cardBrand: null,
          cardLast4: null,
          linkedAt: event.recordedAt,
          source: "manual-non-stripe",
          livemode: null,
          paidAt: event.paidAt,
          operatorNote:
            [
              ob.label,
              event.externalPaymentMethod,
              event.externalReference ? `ref ${event.externalReference}` : null,
              event.operatorNote,
            ]
              .filter(Boolean)
              .join(" · ") || null,
          idempotencyKey: event.idempotencyKey,
        });
      }

      invoices.push({
        id: `ob-${contractId}-${ob.id}`,
        title: ob.label || ob.trigger || `Obligation · ${title}`,
        amountLabel: formatCents(ob.amountCents as never),
        amountPaidLabel: formatCents(paidCents as never),
        remainingLabel: formatCents(remainingCents as never),
        amountCents: ob.amountCents,
        amountPaidCents: paidCents,
        remainingCents,
        status: ob.status,
        statusLabel: formatObligationStatusLabel(ob.status),
        date: ob.paidAt ?? ob.dueDate ?? null,
        dueDate: ob.dueDate ?? null,
        triggerLabel: ob.trigger || ob.dueTerms || null,
        agreementId: contractId,
        agreementTitle: title,
        obligationId: ob.id,
        kind: ob.kind,
        stripeInvoiceId: ob.stripeDraftInvoiceId ?? null,
        hostedInvoiceUrl: null,
        source: "obligation",
        canRecordPayment: isObligationOpenForExternalPayment(ob),
        paymentHistory: history,
        serviceDescription: ob.serviceDescription?.trim() || null,
        internalNotes: ob.internalNotes?.trim() || null,
      });
    }

    if (pkg.paymentReferences?.stripeInvoiceId || pkg.paymentReferences?.hostedInvoiceUrl) {
      invoices.push({
        id: `inv-ref-${contractId}`,
        title: `Invoice · ${title}`,
        amountLabel,
        amountPaidLabel: "—",
        remainingLabel: "—",
        amountCents: amountCents ?? 0,
        amountPaidCents: 0,
        remainingCents: 0,
        status: String(pkg.paymentReferences.paymentStatus ?? "linked"),
        statusLabel: String(pkg.paymentReferences.paymentStatus ?? "linked"),
        date: pkg.paymentReferences.linkedAt ?? null,
        dueDate: null,
        triggerLabel: null,
        agreementId: contractId,
        agreementTitle: title,
        obligationId: null,
        kind: null,
        stripeInvoiceId: pkg.paymentReferences.stripeInvoiceId ?? null,
        hostedInvoiceUrl: pkg.paymentReferences.hostedInvoiceUrl ?? null,
        source: "payment-reference",
        canRecordPayment: false,
        paymentHistory: [],
        serviceDescription: null,
        internalNotes: null,
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

    // Receipts from obligation payment events
    for (const ob of pkg.billingPlan?.obligations ?? []) {
      for (const event of ob.paymentEvents ?? []) {
        receipts.push({
          id: `rcpt-obl-${contractId}-${event.id}`,
          title: `Payment · ${ob.label}`,
          amountLabel: formatCents(event.amountCents as never),
          date: event.paidAt,
          agreementId: contractId,
          agreementTitle: title,
          receiptUrl: null,
          stripeChargeId: null,
        });
      }
    }

    auditTimeline.push(...mapAuditEventsToCommercial(clientId, contractId, pkg.auditEvents));
  }

  for (const inv of input.workspaceInvoices) {
    invoices.push({
      id: `ws-inv-${inv.source}-${inv.id}`,
      title: inv.title,
      amountLabel: inv.amount != null ? formatCents(Math.round(inv.amount * 100) as never) : "—",
      amountPaidLabel: "—",
      remainingLabel: "—",
      amountCents: inv.amount != null ? Math.round(inv.amount * 100) : 0,
      amountPaidCents: 0,
      remainingCents: 0,
      status: inv.status,
      statusLabel: inv.status,
      date: inv.date,
      dueDate: null,
      triggerLabel: null,
      agreementId: null,
      agreementTitle: null,
      obligationId: null,
      kind: null,
      stripeInvoiceId: null,
      hostedInvoiceUrl: null,
      source: "workspace-invoice",
      canRecordPayment: false,
      paymentHistory: [],
      serviceDescription: null,
      internalNotes: null,
    });
  }

  const timeline = mergeCommercialTimeline([
    ...mapWorkspaceTimelineToCommercial(input.timelineEvents),
    ...auditTimeline,
  ]);

  const documentKinds = [...new Set(documents.map((d) => d.kindLabel))];

  // Prefer hydrated primary package for overview financial labels.
  const primaryHydrated = primaryDoc
    ? (() => {
        const raw = normalizeLifecyclePackage(primaryDoc.lifecyclePackage);
        if (!raw.billingPlan) return raw;
        return {
          ...raw,
          billingPlan: ensurePayableSurfacesOnPlan(
            raw.billingPlan,
            raw.structuredPaymentTerms,
          ),
        };
      })()
    : null;

  const overview = buildOverviewFromPrimary({
    clientId,
    agreement: primaryAgreement,
    pkg: primaryHydrated,
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

  const statementView = buildLiveAccountStatement({
    clientId,
    clientName: input.clientName?.trim() || overview.agreementTitle || `Client ${clientId}`,
    clientSlug: input.clientSlug ?? null,
    contactName: input.contactName ?? null,
    primaryAgreementId: primaryAgreement?.id ?? null,
    contracts: contracts.map((doc) => ({
      id: Number(doc.id),
      title: String(doc.title ?? `Agreement ${doc.id}`),
      lifecyclePackage: doc.lifecyclePackage,
    })),
  });

  const statement: CommercialStatementSnapshot = {
    statementDate: statementView.statementDate,
    clientName: statementView.document.clientName,
    contactName: statementView.document.contactName ?? null,
    documentKindLabel: statementView.document.documentKindLabel,
    documentKindValue: statementView.document.documentKindValue,
    currency: statementView.document.currency,
    summary: {
      originalProjectLabel: statementView.document.summary.originalProjectLabel,
      originalProjectValue: formatCents(
        statementView.document.summary.originalProjectCents as never,
      ),
      accountPaymentsReceivedLabel:
        statementView.document.summary.accountPaymentsReceivedLabel,
      accountPaymentsReceivedValue: formatCents(
        statementView.document.summary.accountPaymentsReceivedCents as never,
      ),
      projectBalanceLabel: statementView.document.summary.projectBalanceLabel,
      projectBalanceValue: formatCents(
        statementView.document.summary.projectBalanceCents as never,
      ),
      currentChargesLabel: statementView.document.summary.currentChargesLabel,
      currentChargesValue: formatCents(
        statementView.document.summary.currentChargesCents as never,
      ),
      totalOutstandingLabel: statementView.document.summary.totalOutstandingLabel,
      totalOutstandingValue: formatCents(
        statementView.document.summary.totalOutstandingCents as never,
      ),
    },
    openBalances: statementView.document.openBalances.items.map((item) => ({
      id: item.id,
      description: item.description,
      originalLabel: formatCents(item.originalCents as never),
      paidLabel: formatCents(item.paidCents as never),
      remainingLabel: formatCents(item.remainingCents as never),
      dueDate: item.dueDate ?? null,
      statusLabel: item.statusLabel,
      timingNote: item.timingNote ?? null,
    })),
    upcomingBalances: (statementView.document.openBalances.upcomingItems ?? []).map(
      (item) => ({
        id: item.id,
        description: item.description,
        originalLabel: formatCents(item.originalCents as never),
        paidLabel: formatCents(item.paidCents as never),
        remainingLabel: formatCents(item.remainingCents as never),
        dueDate: item.dueDate ?? null,
        statusLabel: item.statusLabel,
        timingNote: item.timingNote ?? null,
      }),
    ),
    payments: statementView.document.paymentHistory.payments.map((payment) => ({
      id: payment.id,
      paidOn: payment.paidOn,
      label: payment.label,
      detail: payment.detail ?? null,
      amountLabel: formatCents(payment.amountCents as never),
    })),
    totalOutstandingCents: statementView.document.summary.totalOutstandingCents,
    pdfHref: `/api/admin/clients/${clientId}/commercial/account-statement/pdf`,
  };

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
    statement,
    primaryAgreementId: primaryAgreement?.id ?? null,
    externalPaymentEligibleAgreements,
    obligationPaymentTargets,
    recurringServiceTargets,
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
      commercialAmountLabel: "Invoice amount",
      invoiceAmountLabel: "—",
      projectContractedLabel: "—",
      recurringMrrLabel: "—",
      dueNowLabel: "$0.00",
      paidToDateLabel: "$0.00",
      remainingProjectLabel: "$0.00",
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
    statement: null,
    primaryAgreementId: null,
    externalPaymentEligibleAgreements: [],
    obligationPaymentTargets: [],
    recurringServiceTargets: [],
  };
}

/** Status label helper exported for UI. */
export { formatCommercialStatus };
