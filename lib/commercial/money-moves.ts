/**
 * Focused Money Moves read model — commercial truth only.
 * Does not load the full intelligence universe.
 */
import "server-only";

import { cache } from "react";
import { getPayload } from "payload";
import config from "@payload-config";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import {
  monthlyDollarsFromCents,
  resolveClientRecurringCommercialTruth,
  relClientId,
} from "@/lib/financial-command/recurring-commercial-truth";
import { DEFAULT_OTP_COMMISSION_AMOUNT_CENTS } from "@/lib/client-site-intelligence/constants";
import { classifyCommercialRelationship } from "./classification";
import { buildHostingCommercialAuthority } from "./hosting-authority";
import { parseCommercialMarkers } from "./markers";
import type {
  CommercialTotals,
  MoneyMoveItem,
  MoneyMoveState,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const CLOSED_OBL = new Set(["paid", "waived", "cancelled", "void"]);

function clientHref(id: number): string {
  return `/admin/operations/client-command/${id}?tab=financial`;
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export type MoneyMovesSnapshot = {
  generatedAt: string;
  totals: CommercialTotals;
  items: MoneyMoveItem[];
  categoriesByClient: Array<{
    clientId: number;
    clientName: string;
    status: string;
    categories: string[];
    pricingClassification: string | null;
    activeMrrCents: number;
  }>;
};

function obligationState(due: string | null, status: string): MoneyMoveState {
  if (status === "pending-trigger") return "PENDING_TRIGGER";
  if (!due) return "COLLECTIBLE";
  const t = new Date(due).getTime();
  if (Number.isNaN(t)) return "COLLECTIBLE";
  const days = Math.ceil((t - Date.now()) / 86_400_000);
  if (days > 14) return "UPCOMING";
  return "COLLECTIBLE";
}

export const loadMoneyMovesSnapshot = cache(async function loadMoneyMovesSnapshot(): Promise<MoneyMovesSnapshot> {
  const payload = await getPayload({ config });

  const [clientsR, retainersR, contractsR, assignmentsR, siteEventsR, infraR, activitiesR] =
    await Promise.all([
      payload.find({ collection: "clients", limit: 300, depth: 0, overrideAccess: true }),
      payload.find({ collection: "retainers", limit: 300, depth: 0, overrideAccess: true }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "contracts" as any,
        limit: 300,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-service-assignments" as any,
        limit: 500,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-site-events" as any,
        where: {
          or: [
            { commissionStatus: { equals: "due" } },
            {
              and: [
                { eventClass: { equals: "website_lead" } },
                { lifecycleStatus: { in: ["new", "acknowledged"] } },
                { commissionStatus: { equals: "not_due" } },
              ],
            },
          ],
        },
        limit: 100,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-infrastructure" as any,
        limit: 300,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: "sales-activities",
        where: {
          activityType: {
            in: [
              "commercial-trigger",
              "payment-promised",
              "renewal-notice",
              "commission-follow-up",
              "commercial-review",
            ],
          },
        },
        limit: 50,
        depth: 0,
        overrideAccess: true,
        sort: "-occurredAt",
      }),
    ]);

  const retainersByClient = new Map<number, AnyDoc[]>();
  for (const doc of retainersR.docs as AnyDoc[]) {
    const id = relClientId(doc.client);
    if (id == null) continue;
    const list = retainersByClient.get(id) ?? [];
    list.push(doc);
    retainersByClient.set(id, list);
  }
  const contractsByClient = new Map<number, AnyDoc[]>();
  for (const doc of contractsR.docs as AnyDoc[]) {
    const id = relClientId(doc.client);
    if (id == null) continue;
    const list = contractsByClient.get(id) ?? [];
    list.push(doc);
    contractsByClient.set(id, list);
  }
  const infraByClient = new Map<number, AnyDoc>();
  for (const doc of infraR.docs as AnyDoc[]) {
    const id = relClientId(doc.client);
    if (id == null) continue;
    infraByClient.set(id, doc);
  }
  const perfByClient = new Set<number>();
  for (const doc of assignmentsR.docs as AnyDoc[]) {
    if (doc.capabilityId === "performance_component") {
      const id = relClientId(doc.client);
      if (id != null) perfByClient.add(id);
    }
  }

  const items: MoneyMoveItem[] = [];
  const categoriesByClient: MoneyMovesSnapshot["categoriesByClient"] = [];
  let currentVerifiedMrrCents = 0;
  let pendingFutureMrrCents = 0;
  let annualRecurringCents = 0;
  let variablePerformanceCents = 0;
  let projectReceivablesCents = 0;
  let missingAuthorityCount = 0;

  for (const client of clientsR.docs as AnyDoc[]) {
    const clientId = Number(client.id);
    if (!Number.isFinite(clientId)) continue;
    const clientName = String(client.name ?? "Client");
    const retainers = retainersByClient.get(clientId) ?? [];
    const contracts = contractsByClient.get(clientId) ?? [];
    const truth = resolveClientRecurringCommercialTruth({
      clientId,
      retainerDocs: retainers,
      contractPackages: contracts.map((c) => c.lifecyclePackage),
    });

    const activeMrrCents = dollarsToCents(truth.portfolioMrrDollars);
    let pendingMrrCents = 0;
    for (const svc of truth.services) {
      if (svc.activationStatus === "pending-trigger" && svc.amountCents > 0) {
        pendingMrrCents += dollarsToCents(
          monthlyDollarsFromCents(svc.amountCents, svc.cadence),
        );
        items.push({
          id: `pending-mrr:${clientId}:${svc.serviceKey}`,
          clientId,
          clientName,
          kind: "pending_mrr",
          state: "PENDING_TRIGGER",
          title: `${svc.title} — pending start`,
          detail: svc.activationReason || "Awaiting legitimate launch/service trigger.",
          amountCents: svc.amountCents,
          amountIsBooked: false,
          dueDate: svc.effectiveDate,
          serviceStartDate: svc.effectiveDate,
          href: clientHref(clientId),
          authority: "contract-recurring",
        });
      }
    }

    // Planned MRR increases from markers (retainer + client notes)
    const noteBlob = [
      String(client.commercialNotes ?? ""),
      ...retainers.map((r) => String(r.notes ?? "")),
    ].join("\n");
    const plannedSeen = new Set<string>();
    for (const marker of parseCommercialMarkers(noteBlob)) {
      if (marker.kind !== "planned-mrr-increase") continue;
      if (marker.fields.status && marker.fields.status !== "pending") continue;
      const gate = marker.fields.gate ?? "gate";
      const dedupeKey = `${clientId}:${gate}:${marker.fields.to ?? ""}`;
      if (plannedSeen.has(dedupeKey)) continue;
      plannedSeen.add(dedupeKey);
      const delta = Number(marker.fields.delta ?? 0);
      const deltaCents = Number.isFinite(delta) && delta > 0 ? Math.round(delta * 100) : null;
      if (deltaCents) pendingFutureMrrCents += deltaCents;
      items.push({
        id: `planned-mrr:${clientId}:${gate}`,
        clientId,
        clientName,
        kind: "planned_mrr_increase",
        state: "PLANNED",
        title: `Planned MRR +$${delta || "?"} — ${gate}`,
        detail:
          marker.fields.note ||
          `Current $${marker.fields.from ?? "?"} → $${marker.fields.to ?? "?"} after gate. Not current revenue.`,
        amountCents: deltaCents,
        amountIsBooked: false,
        dueDate: null,
        serviceStartDate: null,
        href: clientHref(clientId),
        authority: "operator-commercial-marker",
      });
    }

    currentVerifiedMrrCents += activeMrrCents;
    pendingFutureMrrCents += pendingMrrCents;

    if (activeMrrCents > 0) {
      items.push({
        id: `mrr:${clientId}`,
        clientId,
        clientName,
        kind: "active_mrr",
        state: "COLLECTIBLE",
        title: `Active MRR $${(activeMrrCents / 100).toFixed(0)}`,
        detail: `Source: ${truth.source}`,
        amountCents: activeMrrCents,
        amountIsBooked: true,
        dueDate: null,
        serviceStartDate: null,
        href: clientHref(clientId),
        authority: truth.source,
      });
    }

    let projectOpen = 0;
    for (const contract of contracts) {
      const pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
      for (const obl of pkg.billingPlan?.obligations ?? []) {
        if (CLOSED_OBL.has(String(obl.status))) continue;
        const remaining =
          Math.max(0, Number(obl.amountCents ?? 0) - Number(obl.amountPaidCents ?? 0));
        if (remaining <= 0) continue;
        const kind = String(obl.kind ?? "");
        if (kind === "recurring-period") {
          items.push({
            id: `obl:${clientId}:${obl.id}`,
            clientId,
            clientName,
            kind: "obligation_due",
            state: obligationState(obl.dueDate ?? null, String(obl.status)),
            title: String(obl.label ?? "Recurring period"),
            detail: `Recurring period obligation (${obl.status})`,
            amountCents: remaining,
            amountIsBooked: String(obl.status) !== "pending-trigger",
            dueDate: obl.dueDate ?? null,
            serviceStartDate: null,
            href: clientHref(clientId),
            authority: `contract:${contract.id}`,
          });
          continue;
        }
        // Annual add-ons handled via hosting authority; still collectible if due.
        const isAnnualAddon =
          kind === "addon" &&
          (/hosting|media\s*vault|domain/i.test(String(obl.label ?? "")));
        if (isAnnualAddon) continue;

        projectOpen += remaining;
        items.push({
          id: `proj:${clientId}:${obl.id}`,
          clientId,
          clientName,
          kind: "project_balance",
          state: obligationState(obl.dueDate ?? null, String(obl.status)),
          title: String(obl.label ?? "Project balance"),
          detail: `Open project obligation (${obl.status})`,
          amountCents: remaining,
          amountIsBooked: true,
          dueDate: obl.dueDate ?? null,
          serviceStartDate: null,
          href: clientHref(clientId),
          authority: `contract:${contract.id}`,
        });
      }
    }
    projectReceivablesCents += projectOpen;

    const hostingRows = buildHostingCommercialAuthority({
      clientId,
      clientName,
      contractPackages: contracts.map((c) => c.lifecyclePackage),
      infrastructure: infraByClient.get(clientId) ?? null,
      requireExplicitAmount: true,
    });
    const infra = infraByClient.get(clientId);
    const hasHostingSignal =
      Boolean(infra?.hostingProvider) ||
      Boolean(infra?.hostingAnnualAmountCents) ||
      hostingRows.some((r) => r.amountAuthority === "contract");
    let hasAnnual = false;
    for (const row of hostingRows) {
      if (row.amountAuthority === "missing" && row.status === "missing_authority") {
        if (!hasHostingSignal) continue;
        missingAuthorityCount += 1;
        items.push({
          id: `hosting-missing:${clientId}:${row.serviceTitle}`,
          clientId,
          clientName,
          kind: "annual_renewal",
          state: "REVIEW_REQUIRED",
          title: `${row.serviceTitle} — missing amount authority`,
          detail: "Do not invent annual hosting amount. Investigate commercial evidence.",
          amountCents: null,
          amountIsBooked: false,
          dueDate: row.renewalDate,
          serviceStartDate: row.serviceStartDate,
          href: clientHref(clientId),
          authority: "missing",
        });
        continue;
      }
      if (row.annualAmountCents != null && row.annualAmountCents > 0) {
        hasAnnual = true;
        annualRecurringCents += row.annualAmountCents;
        const state: MoneyMoveState =
          row.renewalLifecycle === "notice_due" || row.renewalLifecycle === "charge_due"
            ? "RENEWAL"
            : row.status === "pending_trigger"
              ? "PENDING_TRIGGER"
              : "RENEWAL";
        items.push({
          id: `annual:${clientId}:${row.serviceTitle}`,
          clientId,
          clientName,
          kind: "annual_renewal",
          state,
          title: row.serviceTitle,
          detail: [
            row.serviceStartDate ? `Service start ${row.serviceStartDate}` : null,
            row.billingDueDate ? `Billing due ${row.billingDueDate}` : null,
            `Auto-charge: ${row.autoChargeMode}`,
            `Lifecycle: ${row.renewalLifecycle}`,
          ]
            .filter(Boolean)
            .join(" · "),
          amountCents: row.annualAmountCents,
          amountIsBooked: false,
          dueDate: row.billingDueDate ?? row.renewalDate,
          serviceStartDate: row.serviceStartDate,
          href: clientHref(clientId),
          authority: row.amountAuthority,
        });
      }
    }

    const categories = classifyCommercialRelationship({
      clientStatus: client.status,
      explicitCategories: client.commercialCategories,
      pricingClassification: client.pricingClassification,
      commercialNotes: client.commercialNotes,
      activeMrrCents,
      pendingMrrCents,
      projectOpenCents: projectOpen,
      hasPerformanceRule: perfByClient.has(clientId),
      hasAnnualOnlyAuthority: hasAnnual && activeMrrCents <= 0 && projectOpen <= 0,
      hasPipelineEvidence: false,
    });

    if (categories.includes("review_required")) {
      items.push({
        id: `review:${clientId}`,
        clientId,
        clientName,
        kind: "commercial_review",
        state: "REVIEW_REQUIRED",
        title: "Commercial relationship review",
        detail:
          String(client.commercialReviewReason ?? "").trim() ||
          parseCommercialMarkers(client.commercialNotes).find((m) => m.kind === "review-required")
            ?.fields.reason ||
          "Current commercial activity not proven — excluded from verified MRR.",
        amountCents: null,
        amountIsBooked: false,
        dueDate: null,
        serviceStartDate: null,
        href: clientHref(clientId),
        authority: "operator-review",
      });
    }

    categoriesByClient.push({
      clientId,
      clientName,
      status: String(client.status ?? ""),
      categories,
      pricingClassification:
        typeof client.pricingClassification === "string" ? client.pricingClassification : null,
      activeMrrCents,
    });
  }

  // CSI performance commissions / leads awaiting confirmation
  for (const ev of siteEventsR.docs as AnyDoc[]) {
    const clientId = relClientId(ev.client);
    if (clientId == null) continue;
    const clientName =
      categoriesByClient.find((c) => c.clientId === clientId)?.clientName ?? "Client";
    if (ev.commissionStatus === "due") {
      const amt = Number(ev.commissionAmountCents ?? DEFAULT_OTP_COMMISSION_AMOUNT_CENTS);
      variablePerformanceCents += amt;
      items.push({
        id: `commission-due:${ev.id}`,
        clientId,
        clientName,
        kind: "commission",
        state: "COLLECTIBLE",
        title: "Performance commission due",
        detail: `Sale confirmed — collect $${(amt / 100).toFixed(0)}. Not MRR.`,
        amountCents: amt,
        amountIsBooked: false,
        dueDate: null,
        serviceStartDate: null,
        href: clientHref(clientId),
        authority: "csi-commission",
      });
    } else {
      items.push({
        id: `commission-pending:${ev.id}`,
        clientId,
        clientName,
        kind: "commission",
        state: "VARIABLE_NEEDS_CONFIRMATION",
        title: "Cart lead — sale confirmation needed",
        detail:
          "Web-generated lead attributed. Commission is NOT earned until qualifying sale is operator-confirmed.",
        amountCents: DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
        amountIsBooked: false,
        dueDate: null,
        serviceStartDate: null,
        href: clientHref(clientId),
        authority: "csi-website-lead",
      });
    }
  }

  // Operator sales-memory activities that imply money movement
  for (const act of activitiesR.docs as AnyDoc[]) {
    const clientId = relClientId(act.client);
    const type = String(act.activityType ?? "");
    if (type === "commercial-review" || type === "commission-follow-up") {
      items.push({
        id: `activity:${act.id}`,
        clientId: clientId ?? 0,
        clientName: String(act.title ?? "Sales memory"),
        kind: type === "commercial-review" ? "commercial_review" : "commission",
        state: type === "commercial-review" ? "REVIEW_REQUIRED" : "VARIABLE_NEEDS_CONFIRMATION",
        title: String(act.title ?? "Operator commercial memory"),
        detail: String(act.summary ?? ""),
        amountCents: null,
        amountIsBooked: false,
        dueDate: null,
        serviceStartDate: null,
        href: clientId ? clientHref(clientId) : "/admin/sales/activities",
        authority: "sales-activity",
      });
    }
  }

  // Deduplicate active_mrr noise — keep summary metrics, surface action items preferentially
  const actionItems = items.filter((i) => i.kind !== "active_mrr");
  const priority: Record<MoneyMoveState, number> = {
    COLLECTIBLE: 0,
    VARIABLE_NEEDS_CONFIRMATION: 1,
    RENEWAL: 2,
    PENDING_TRIGGER: 3,
    UPCOMING: 4,
    PLANNED: 5,
    REVIEW_REQUIRED: 6,
  };
  actionItems.sort(
    (a, b) =>
      (priority[a.state] ?? 9) - (priority[b.state] ?? 9) ||
      (b.amountCents ?? 0) - (a.amountCents ?? 0),
  );

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      currentVerifiedMrrCents,
      pendingFutureMrrCents,
      annualRecurringCents,
      variablePerformanceCents,
      projectReceivablesCents,
      missingAuthorityCount,
    },
    items: actionItems,
    categoriesByClient: categoriesByClient.sort((a, b) => b.activeMrrCents - a.activeMrrCents),
  };
});
