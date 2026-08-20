/**
 * Derive structured, reviewable payment terms from an accepted canonical proposal.
 * Optional contract-only amendments overlay schedule/recurring without mutating the proposal.
 */

import type { CanonicalProposal } from "../proposal-builder/types.ts";
import type { ContractCommercialAmendments } from "./commercial-amendments.ts";
import { newLifecycleId } from "./hash.ts";
import type { StructuredPaymentTerms } from "./types.ts";

export function deriveStructuredPaymentTerms(
  canonical: CanonicalProposal,
  acceptanceHash?: string,
  amendments?: ContractCommercialAmendments | null,
): StructuredPaymentTerms {
  const schedule = amendments?.paymentScheduleOverride?.length
    ? amendments.paymentScheduleOverride
    : canonical.paymentSchedule;

  const installments = schedule.map((item) => {
    const amended = item as typeof item & {
      group?: "initial-deposit" | "remaining" | "other";
      notes?: string;
    };
    return {
      id: item.id || newLifecycleId("obl"),
      label: item.label,
      amountCents: item.amountCents,
      trigger: item.due,
      dueTerms: describeDue(item.due, item.dueDate),
      dueDate: item.dueDate ?? null,
      group: amended.group,
      notes: amended.notes,
      status: "pending-trigger" as const,
    };
  });

  const depositFromAmendments = amendments?.paymentScheduleOverride
    ?.filter((p) => p.group === "initial-deposit")
    .reduce((a, p) => a + p.amountCents, 0);
  const deposit = depositFromAmendments ?? canonical.totals.depositCents;
  const initial = installments[0];

  const recurringService = amendments?.recurringService;
  const monthlyTotalCents =
    recurringService?.amountCents ?? canonical.totals.monthlyTotalCents;

  const recurringStartTrigger = (): string => {
    if (monthlyTotalCents <= 0) return "not-applicable";
    if (!recurringService) return "after-launch-verified";
    if (recurringService.startTrigger === "website-launch") return "website-launch";
    if (recurringService.startBillingDateStatus === "confirmed" && recurringService.startBillingDate) {
      return "confirmed-start-date";
    }
    if (recurringService.startBillingDateStatus === "milestone-confirmed") {
      return recurringService.startTrigger || "website-launch";
    }
    return "pending-confirmation";
  };

  const recurringStartStatus = ():
    | "confirmed"
    | "pending-confirmation"
    | "milestone-confirmed"
    | "not-applicable" => {
    if (monthlyTotalCents <= 0) return "not-applicable";
    if (!recurringService) return "pending-confirmation";
    return recurringService.startBillingDateStatus;
  };

  const renewalBehavior = (): string => {
    if (monthlyTotalCents <= 0) return "none";
    if (!recurringService) {
      return "[REVIEW REQUIRED] Define renewal/cancellation in final agreement";
    }
    if (recurringService.startTrigger === "website-launch") {
      return "Month-to-month beginning at website launch / production launch, subject to the Agreement’s termination and cancellation provisions.";
    }
    if (recurringService.startBillingDateStatus === "pending-confirmation") {
      return "Month-to-month unless otherwise agreed in writing. Start/billing date requires confirmation before signature when marked pending.";
    }
    return "Month-to-month unless otherwise agreed in writing.";
  };

  return {
    schemaVersion: 1,
    currency: canonical.currency || "USD",
    oneTimeTotalCents: canonical.totals.oneTimeTotalCents,
    monthlyTotalCents,
    depositCents: deposit,
    initialPayment: {
      type: deposit > 0 ? "deposit" : canonical.totals.oneTimeTotalCents > 0 ? "full" : "none",
      amountCents: initial?.amountCents ?? deposit,
      trigger:
        (initial?.trigger as "at-acceptance" | "at-contract" | "on-date" | "manual") ||
        "at-acceptance",
      dueTerms: initial?.dueTerms ?? "Due upon proposal acceptance / contract execution",
    },
    installments,
    recurring: {
      amountCents: monthlyTotalCents,
      cadence: monthlyTotalCents > 0 ? "monthly" : "none",
      startTrigger: recurringStartTrigger(),
      minimumTermMonths: monthlyTotalCents > 0 ? (recurringService ? null : 12) : null,
      renewalBehavior: renewalBehavior(),
      status: monthlyTotalCents > 0 ? "pending-trigger" : "cancelled",
      startBillingDate: recurringService?.startBillingDate ?? null,
      startBillingDateStatus: recurringStartStatus(),
      serviceTitle: recurringService?.title ?? null,
      includes: recurringService?.includes ?? [],
      excludes: recurringService?.excludes ?? [],
      rankingDisclaimer: recurringService?.rankingDisclaimer ?? null,
      commencementNotes: recurringService?.commencementNotes ?? null,
    },
    ancillaryCharges: (amendments?.ancillaryCharges ?? []).map((charge) => ({
      id: charge.id,
      kind: charge.kind,
      title: charge.title,
      amountCents: charge.amountCents,
      cadence: charge.cadence,
      dueTrigger: charge.dueTrigger,
      dueDate: charge.dueDate ?? null,
      termNotes: charge.termNotes,
      renewalNotes: charge.renewalNotes ?? null,
      status: "pending-trigger" as const,
    })),
    credits: canonical.credits.map((c) => ({
      label: c.label,
      amountCents: c.amountCents,
      appliesTo: c.appliesTo,
    })),
    taxes: {
      treatment: "unspecified",
      notes: "[BLOCKER until reviewed] Tax treatment must be confirmed before invoice send.",
    },
    billingContactName: canonical.primaryContact?.name ?? "",
    billingEmail: canonical.primaryContact?.email ?? "",
    payerLegalName: canonical.primaryOrganization,
    brandName: canonical.organizations.map((o) => o.name).join(" · ") || undefined,
    commercialSource: "proposal",
    sourceProposalNumber: canonical.proposalNumber,
    sourceProposalVersion: canonical.version,
    sourceAcceptanceHash: acceptanceHash,
    derivedAt: new Date().toISOString(),
  };
}

function describeDue(due: string, dueDate?: string | null): string {
  switch (due) {
    case "at-acceptance":
      return "Due upon proposal acceptance";
    case "at-contract":
      return "Due at contract signing";
    case "milestone":
      return "Due at project milestone";
    case "remaining":
      return "Final payment";
    case "on-date":
      return dueDate ? `Due on ${dueDate}` : "Due on scheduled date";
    default:
      return "Payment timing requires review";
  }
}

export function reconcileInstallments(
  terms: StructuredPaymentTerms,
): { sumCents: number; differenceCents: number; ok: boolean } {
  const sum = terms.installments.reduce((acc, i) => acc + i.amountCents, 0);
  const target = terms.oneTimeTotalCents;
  const differenceCents = sum - target;
  return { sumCents: sum, differenceCents, ok: differenceCents === 0 };
}
