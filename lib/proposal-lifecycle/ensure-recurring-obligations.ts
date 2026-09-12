/**
 * Deterministic recurring obligation materialization.
 *
 * ensureRecurringObligationsThroughDate — ENSURE, not blind create.
 * Creates missing recurring-period obligations only through the requested date.
 * Never creates Stripe subscriptions, invoices, or payment evidence.
 */

import { getPayload } from "payload";
import config from "@payload-config";
import type {
  ContractLifecyclePackage,
  ProposedBillingPlan,
} from "./types.ts";
import {
  buildRecurringOccurrenceSourceKey,
  ensureRecurringDueOccurrenceOnPlan,
  previewRecurringDueOccurrence,
  resolveMonthlyDueDate,
  type RecurringDueOccurrenceInput,
} from "./ensure-payable-surfaces.ts";
import {
  periodYearMonthsForService,
  resolveRecurringAuthority,
  type RecurringAuthorityConflict,
  type ResolvedRecurringService,
} from "./recurring-authority.ts";
import { normalizeLifecyclePackage, appendAudit } from "./package.ts";

export type RecurringEnsureSkipReason =
  | "pending-trigger"
  | "inactive"
  | "conflict"
  | "no-effective-date"
  | "beyond-through-date"
  | "already-present";

export type RecurringPeriodPlanItem = {
  serviceKey: string;
  serviceTitle: string;
  periodYearMonth: string;
  sourceKey: string;
  amountCents: number;
  dueDate: string;
  action: "create" | "already-present" | "skip";
  skipReason?: RecurringEnsureSkipReason | string;
  existingObligationId?: string | null;
};

export type EnsureRecurringObligationsResult = {
  throughDate: string;
  servicesEvaluated: Array<{
    serviceKey: string;
    title: string;
    amountCents: number;
    cadence: string;
    activationStatus: string;
    activationReason: string;
    source: string;
  }>;
  periods: RecurringPeriodPlanItem[];
  created: RecurringPeriodPlanItem[];
  alreadyPresent: RecurringPeriodPlanItem[];
  skipped: Array<{
    serviceKey: string;
    title: string;
    reason: string;
  }>;
  conflicts: RecurringAuthorityConflict[];
  warnings: string[];
  plan: ProposedBillingPlan;
  createdCount: number;
};

function throughDateParts(throughDate: string): { date: string; yearMonth: string } {
  const raw = String(throughDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error("throughDate must be YYYY-MM-DD.");
  }
  return { date: raw, yearMonth: raw.slice(0, 7) };
}

function buildOccurrenceInput(
  service: ResolvedRecurringService,
  periodYearMonth: string,
): RecurringDueOccurrenceInput {
  const dueDate = resolveMonthlyDueDate(periodYearMonth, service.billDay);
  const sourceKey = buildRecurringOccurrenceSourceKey(
    service.serviceKey,
    periodYearMonth,
  );
  return {
    sourceKey,
    label: `${service.title} — ${periodYearMonth}`,
    amountCents: service.amountCents,
    currency: service.currency,
    dueDate,
    serviceTitle: service.title,
    serviceDescription: service.description,
    billingCadence: service.cadence,
    billDay: service.billDay,
    serviceEffectiveDate: service.effectiveDate,
    serviceDefinitionKey: service.serviceKey,
  };
}

/**
 * Pure plan ensure: materialize missing recurring periods through throughDate.
 * Does not persist. Does not touch Stripe.
 */
export function ensureRecurringObligationsThroughDateOnPlan(
  plan: ProposedBillingPlan,
  pkg: ContractLifecyclePackage,
  throughDate: string,
): EnsureRecurringObligationsResult {
  const { date: through, yearMonth: throughYm } = throughDateParts(throughDate);
  const resolution = resolveRecurringAuthority({ ...pkg, billingPlan: plan });

  const servicesEvaluated = resolution.services.map((service) => ({
    serviceKey: service.serviceKey,
    title: service.title,
    amountCents: service.amountCents,
    cadence: service.cadence,
    activationStatus: service.activationStatus,
    activationReason: service.activationReason,
    source: service.source,
  }));

  const periods: RecurringPeriodPlanItem[] = [];
  const skipped: EnsureRecurringObligationsResult["skipped"] = [];
  let nextPlan = plan;

  if (resolution.conflicts.length > 0) {
    for (const service of resolution.services) {
      skipped.push({
        serviceKey: service.serviceKey,
        title: service.title,
        reason: "conflict",
      });
    }
    return {
      throughDate: through,
      servicesEvaluated,
      periods,
      created: [],
      alreadyPresent: [],
      skipped,
      conflicts: resolution.conflicts,
      warnings: resolution.warnings,
      plan,
      createdCount: 0,
    };
  }

  for (const service of resolution.services) {
    if (service.activationStatus === "inactive" || !service.active) {
      skipped.push({
        serviceKey: service.serviceKey,
        title: service.title,
        reason:
          service.activationStatus === "pending-trigger"
            ? `pending-trigger: ${service.activationReason}`
            : service.activationReason || service.activationStatus,
      });
      continue;
    }

    if (!service.effectiveDate) {
      skipped.push({
        serviceKey: service.serviceKey,
        title: service.title,
        reason: "no-effective-date",
      });
      continue;
    }

    if (service.effectiveDate > through) {
      skipped.push({
        serviceKey: service.serviceKey,
        title: service.title,
        reason: "beyond-through-date",
      });
      continue;
    }

    const periodMonths = periodYearMonthsForService({
      cadence: service.cadence,
      effectiveDate: service.effectiveDate,
      throughDate: through,
      endDate: service.endDate,
    });

    for (const periodYearMonth of periodMonths) {
      if (periodYearMonth > throughYm) continue;

      const occurrence = buildOccurrenceInput(service, periodYearMonth);
      const preview = previewRecurringDueOccurrence(nextPlan, occurrence);
      if (!preview.wouldCreate) {
        periods.push({
          serviceKey: service.serviceKey,
          serviceTitle: service.title,
          periodYearMonth,
          sourceKey: occurrence.sourceKey,
          amountCents: occurrence.amountCents,
          dueDate: occurrence.dueDate,
          action: "already-present",
          skipReason: "already-present",
          existingObligationId: preview.existingObligationId,
        });
        continue;
      }

      nextPlan = ensureRecurringDueOccurrenceOnPlan(nextPlan, occurrence);
      periods.push({
        serviceKey: service.serviceKey,
        serviceTitle: service.title,
        periodYearMonth,
        sourceKey: occurrence.sourceKey,
        amountCents: occurrence.amountCents,
        dueDate: occurrence.dueDate,
        action: "create",
        existingObligationId: null,
      });
    }
  }

  const created = periods.filter((item) => item.action === "create");
  const alreadyPresent = periods.filter((item) => item.action === "already-present");

  return {
    throughDate: through,
    servicesEvaluated,
    periods,
    created,
    alreadyPresent,
    skipped,
    conflicts: resolution.conflicts,
    warnings: resolution.warnings,
    plan: nextPlan,
    createdCount: created.length,
  };
}

/** Dry-run / preview — never mutates the input package plan. */
export function previewRecurringObligationsThroughDate(
  pkg: ContractLifecyclePackage,
  throughDate: string,
): EnsureRecurringObligationsResult {
  if (!pkg.billingPlan) {
    throw new Error("Billing plan is required before ensuring recurring obligations.");
  }
  const clonedPlan: ProposedBillingPlan = {
    ...pkg.billingPlan,
    obligations: [...pkg.billingPlan.obligations],
  };
  const result = ensureRecurringObligationsThroughDateOnPlan(clonedPlan, pkg, throughDate);
  return {
    ...result,
    plan: pkg.billingPlan,
  };
}

type AnyDoc = Record<string, unknown> & { id: number };

/**
 * Persist ensure through date. No Stripe. No invoices. No payment writes.
 * Refuses to persist when authority conflicts exist.
 */
export async function ensureRecurringObligationsThroughDateOnContract(input: {
  contractId: number;
  throughDate: string;
  actor: string;
  /** When true, compute only — no DB write. */
  dryRun?: boolean;
}): Promise<
  EnsureRecurringObligationsResult & {
    pkg: ContractLifecyclePackage;
    persisted: boolean;
  }
> {
  const payload = await getPayload({ config });
  const contract = (await payload.findByID({
    collection: "contracts" as never,
    id: input.contractId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  if (!pkg.billingPlan) {
    throw new Error("Billing plan is required before ensuring recurring obligations.");
  }

  const result = ensureRecurringObligationsThroughDateOnPlan(
    pkg.billingPlan,
    pkg,
    input.throughDate,
  );

  if (input.dryRun || result.createdCount <= 0 || result.conflicts.length > 0) {
    return { ...result, pkg, persisted: false };
  }

  let next: ContractLifecyclePackage = {
    ...pkg,
    billingPlan: result.plan,
  };
  next = appendAudit(next, {
    actor: input.actor,
    action: "billing.recurring-obligations-ensured",
    reason: `Ensured recurring obligations through ${result.throughDate}: created ${result.createdCount}, already present ${result.alreadyPresent.length}, skipped ${result.skipped.length}.`,
  });

  await payload.update({
    collection: "contracts" as never,
    id: input.contractId,
    data: { lifecyclePackage: next } as never,
    overrideAccess: true,
  });

  return { ...result, pkg: next, persisted: true };
}
