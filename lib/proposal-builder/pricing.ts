/**
 * Server-authoritative proposal pricing with integer cents.
 */

import {
  addCents,
  clampNonNegative,
  mulCents,
  percentOfCents,
  subCents,
  type Cents,
} from "./money.ts";
import type {
  PaymentScheduleItem,
  ProposalCredit,
  ProposalDocument,
  ProposalPricingLine,
  PricingTotals,
} from "./types.ts";

export interface SelectionInput {
  selectedLineIds?: string[];
  selectedPackageKeys?: string[];
}

function lineAmount(line: ProposalPricingLine): Cents {
  return mulCents(line.unitPriceCents, line.quantity > 0 ? line.quantity : 1);
}

function isLineSelected(
  line: ProposalPricingLine,
  doc: ProposalDocument,
  selection: SelectionInput,
): boolean {
  if (line.inclusion === "excluded") return false;

  const clientCanSelect = doc.options.clientCanSelect;
  const selectedIds = new Set(selection.selectedLineIds ?? []);
  const selectedPackages = new Set(selection.selectedPackageKeys ?? []);

  if (line.inclusion === "included" && !line.isAddon && !line.packageKey) {
    return true;
  }

  if (line.packageKey) {
    if (selectedPackages.size > 0) {
      return selectedPackages.has(line.packageKey);
    }
    if (doc.options.recommendedPackageKey) {
      return line.packageKey === doc.options.recommendedPackageKey;
    }
    if (line.inclusion === "included") return true;
    return false;
  }

  if (line.inclusion === "optional" || line.isAddon) {
    if (!clientCanSelect) {
      return line.inclusion === "included";
    }
    if (selectedIds.size === 0) return false;
    return selectedIds.has(line.id);
  }

  return line.inclusion === "included";
}

function applyCredits(
  credits: ProposalCredit[],
  oneTime: Cents,
  monthly: Cents,
  quarterly: Cents,
  annual: Cents,
): {
  oneTime: Cents;
  monthly: Cents;
  quarterly: Cents;
  annual: Cents;
  creditOneTime: Cents;
  creditMonthly: Cents;
} {
  let creditOneTime = 0;
  let creditMonthly = 0;
  let creditAnnual = 0;

  for (const credit of credits) {
    if (credit.kind === "discount") continue;
    const amt = clampNonNegative(credit.amountCents);
    if (credit.appliesTo === "one-time" || credit.appliesTo === "all") {
      creditOneTime = addCents(creditOneTime, amt);
    }
    if (credit.appliesTo === "monthly" || credit.appliesTo === "all") {
      creditMonthly = addCents(creditMonthly, amt);
    }
    if (credit.appliesTo === "annual" || credit.appliesTo === "all") {
      creditAnnual = addCents(creditAnnual, amt);
    }
  }

  return {
    oneTime: clampNonNegative(subCents(oneTime, creditOneTime)),
    monthly: clampNonNegative(subCents(monthly, creditMonthly)),
    quarterly: clampNonNegative(quarterly), // no separate quarterly credit channel yet
    annual: clampNonNegative(subCents(annual, creditAnnual)),
    creditOneTime,
    creditMonthly,
  };
}

function applyDiscounts(credits: ProposalCredit[], oneTime: Cents): { after: Cents; discount: Cents } {
  let discount = 0;
  for (const credit of credits) {
    if (credit.kind !== "discount") continue;
    discount = addCents(discount, clampNonNegative(credit.amountCents));
  }
  return { after: clampNonNegative(subCents(oneTime, discount)), discount };
}

function scheduleAmounts(schedule: PaymentScheduleItem[]): {
  dueAtAcceptanceCents: Cents;
  dueAtContractCents: Cents;
  remainingBalanceCents: Cents;
} {
  let dueAtAcceptanceCents = 0;
  let dueAtContractCents = 0;
  let remainingBalanceCents = 0;
  for (const item of schedule) {
    const amt = clampNonNegative(item.amountCents);
    if (item.due === "at-acceptance") dueAtAcceptanceCents = addCents(dueAtAcceptanceCents, amt);
    else if (item.due === "at-contract") dueAtContractCents = addCents(dueAtContractCents, amt);
    else if (item.due === "remaining") remainingBalanceCents = addCents(remainingBalanceCents, amt);
  }
  return { dueAtAcceptanceCents, dueAtContractCents, remainingBalanceCents };
}

export function calculateProposalTotals(
  doc: ProposalDocument,
  selection: SelectionInput = {},
): PricingTotals {
  let oneTimeSubtotal = 0;
  let monthlySubtotal = 0;
  let quarterlySubtotal = 0;
  let annualSubtotal = 0;
  let optionalOneTime = 0;
  let optionalMonthly = 0;
  const selectedLineIds: string[] = [];
  const selectedPackageKeys = new Set<string>();

  for (const line of doc.pricingLines) {
    const amt = lineAmount(line);
    const selected = isLineSelected(line, doc, selection);

    if (line.inclusion === "optional" || line.isAddon) {
      if (line.cadence === "monthly") optionalMonthly = addCents(optionalMonthly, amt);
      else if (line.cadence === "one-time") optionalOneTime = addCents(optionalOneTime, amt);
    }

    if (!selected) continue;
    selectedLineIds.push(line.id);
    if (line.packageKey) selectedPackageKeys.add(line.packageKey);

    if (line.cadence === "monthly") monthlySubtotal = addCents(monthlySubtotal, amt);
    else if (line.cadence === "quarterly") quarterlySubtotal = addCents(quarterlySubtotal, amt);
    else if (line.cadence === "annual") annualSubtotal = addCents(annualSubtotal, amt);
    else oneTimeSubtotal = addCents(oneTimeSubtotal, amt);
  }

  const credited = applyCredits(
    doc.credits,
    oneTimeSubtotal,
    monthlySubtotal,
    quarterlySubtotal,
    annualSubtotal,
  );
  const discounted = applyDiscounts(doc.credits, credited.oneTime);
  const taxCents =
    doc.taxRateBps > 0 ? percentOfCents(discounted.after, doc.taxRateBps / 100) : 0;
  const oneTimeTotalCents = addCents(discounted.after, taxCents);

  const schedule = scheduleAmounts(doc.paymentSchedule);
  let remainingBalanceCents = schedule.remainingBalanceCents;
  if (remainingBalanceCents === 0 && doc.paymentSchedule.length === 0) {
    remainingBalanceCents = clampNonNegative(
      subCents(
        oneTimeTotalCents,
        addCents(schedule.dueAtAcceptanceCents, schedule.dueAtContractCents, doc.depositCents),
      ),
    );
  }

  return {
    currency: doc.currency || "USD",
    oneTimeSubtotalCents: oneTimeSubtotal,
    monthlySubtotalCents: monthlySubtotal,
    quarterlySubtotalCents: quarterlySubtotal,
    annualSubtotalCents: annualSubtotal,
    optionalOneTimeCents: optionalOneTime,
    optionalMonthlyCents: optionalMonthly,
    creditOneTimeCents: credited.creditOneTime,
    creditMonthlyCents: credited.creditMonthly,
    discountOneTimeCents: discounted.discount,
    taxCents,
    oneTimeTotalCents,
    monthlyTotalCents: credited.monthly,
    quarterlyTotalCents: credited.quarterly,
    annualTotalCents: credited.annual,
    dueAtAcceptanceCents: schedule.dueAtAcceptanceCents,
    dueAtContractCents: schedule.dueAtContractCents,
    remainingBalanceCents,
    depositCents: clampNonNegative(doc.depositCents),
    selectedLineIds,
    selectedPackageKeys: [...selectedPackageKeys],
  };
}

/** Sync legacy dollar fields from cents totals for existing list/dashboard consumers. */
export function totalsToLegacyFields(totals: PricingTotals): {
  investment: number;
  recurringAmount: number;
  pricingSnapshot: PricingTotals;
} {
  return {
    investment: totals.oneTimeTotalCents / 100,
    recurringAmount: totals.monthlyTotalCents / 100,
    pricingSnapshot: totals,
  };
}
