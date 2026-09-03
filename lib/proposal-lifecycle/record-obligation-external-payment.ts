/**
 * Persist obligation-level external payment (Cash App, etc.) on a contract lifecycle package.
 * Supports single-obligation and multi-obligation allocation. Never calls Stripe.
 */

import { getPayload } from "payload";
import config from "@payload-config";
import {
  applyAllocatedExternalPayment,
  applyObligationExternalPayment,
  type RecordAllocatedExternalPaymentInput,
  type RecordObligationExternalPaymentInput,
  type AllocationPreview,
} from "./external-obligation-payment.ts";
import {
  ensurePayableSurfacesOnPlan,
  ensureRecurringDueOccurrenceOnPlan,
  type RecurringDueOccurrenceInput,
} from "./ensure-payable-surfaces.ts";
import { normalizeLifecyclePackage, appendAudit } from "./package.ts";
import type { ContractLifecyclePackage } from "./types.ts";

type AnyDoc = Record<string, unknown> & { id: number };

export type { RecurringDueOccurrenceInput };

async function loadContractPackage(contractId: number): Promise<{
  payload: Awaited<ReturnType<typeof getPayload>>;
  contract: AnyDoc;
  pkg: ContractLifecyclePackage;
}> {
  const payload = await getPayload({ config });
  const contract = (await payload.findByID({
    collection: "contracts" as never,
    id: contractId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  let pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  if (pkg.billingPlan) {
    const nextPlan = ensurePayableSurfacesOnPlan(pkg.billingPlan, pkg.structuredPaymentTerms);
    if (nextPlan.obligations.length !== pkg.billingPlan.obligations.length) {
      pkg = {
        ...pkg,
        billingPlan: nextPlan,
      };
      // Persist ancillary projections so obligation IDs stay stable across sessions.
      await payload.update({
        collection: "contracts" as never,
        id: contractId,
        data: { lifecyclePackage: pkg } as never,
        overrideAccess: true,
      });
    }
  }

  return { payload, contract, pkg };
}

async function persistPackage(
  payload: Awaited<ReturnType<typeof getPayload>>,
  contractId: number,
  contractStatus: string,
  previous: ContractLifecyclePackage,
  next: ContractLifecyclePackage,
  idempotentReplay: boolean,
): Promise<ContractLifecyclePackage> {
  const { applyOnboardingEligibility } = await import("./onboarding-eligibility.ts");
  let sealed = applyOnboardingEligibility(next, contractStatus);
  if (sealed.onboardingEligible && !previous.onboardingEligible) {
    sealed = appendAudit(sealed, {
      actor: "system",
      action: "onboarding.eligible",
      reason: "Executed contract + verified initial obligation payment.",
    });
  }

  if (!idempotentReplay) {
    await payload.update({
      collection: "contracts" as never,
      id: contractId,
      data: { lifecyclePackage: sealed } as never,
      overrideAccess: true,
    });
  }

  return sealed;
}

export async function recordObligationExternalPaymentOnContract(
  input: RecordObligationExternalPaymentInput & { contractId: number },
): Promise<{ pkg: ContractLifecyclePackage; idempotentReplay: boolean }> {
  const { payload, contract, pkg } = await loadContractPackage(input.contractId);
  if (!pkg.billingPlan) {
    throw new Error(
      "Billing plan is not prepared yet. Prepare the billing plan before recording obligation payments.",
    );
  }

  const applied = applyObligationExternalPayment(pkg, input);
  if (!applied.ok) {
    throw new Error(
      Object.entries(applied.errors)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
    );
  }

  const sealed = await persistPackage(
    payload,
    input.contractId,
    String(contract.status ?? ""),
    pkg,
    applied.pkg,
    applied.idempotentReplay,
  );
  return { pkg: sealed, idempotentReplay: applied.idempotentReplay };
}

export async function recordAllocatedExternalPaymentOnContract(
  input: RecordAllocatedExternalPaymentInput & { contractId: number },
): Promise<{
  pkg: ContractLifecyclePackage;
  idempotentReplay: boolean;
  preview: AllocationPreview;
}> {
  const { payload, contract, pkg } = await loadContractPackage(input.contractId);
  if (!pkg.billingPlan) {
    throw new Error(
      "Billing plan is not prepared yet. Prepare the billing plan before recording obligation payments.",
    );
  }

  const applied = applyAllocatedExternalPayment(pkg, input);
  if (!applied.ok) {
    throw new Error(
      Object.entries(applied.errors)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
    );
  }

  const sealed = await persistPackage(
    payload,
    input.contractId,
    String(contract.status ?? ""),
    pkg,
    applied.pkg,
    applied.idempotentReplay,
  );
  return {
    pkg: sealed,
    idempotentReplay: applied.idempotentReplay,
    preview: applied.preview,
  };
}

export async function ensureRecurringDueOccurrenceOnContract(input: {
  contractId: number;
  actor: string;
  occurrence: RecurringDueOccurrenceInput;
}): Promise<{ pkg: ContractLifecyclePackage; created: boolean }> {
  const { payload, pkg } = await loadContractPackage(input.contractId);
  if (!pkg.billingPlan) {
    throw new Error("Billing plan is required before registering a recurring due occurrence.");
  }

  const beforeCount = pkg.billingPlan.obligations.length;
  const nextPlan = ensureRecurringDueOccurrenceOnPlan(pkg.billingPlan, input.occurrence);
  const created = nextPlan.obligations.length > beforeCount;
  if (!created) {
    return { pkg, created: false };
  }

  let next: ContractLifecyclePackage = {
    ...pkg,
    billingPlan: nextPlan,
  };
  next = appendAudit(next, {
    actor: input.actor,
    action: "billing.recurring-due-registered",
    reason: `${input.occurrence.label} · $${(input.occurrence.amountCents / 100).toFixed(2)} due ${input.occurrence.dueDate}`,
  });

  await payload.update({
    collection: "contracts" as never,
    id: input.contractId,
    data: { lifecyclePackage: next } as never,
    overrideAccess: true,
  });

  return { pkg: next, created: true };
}

/**
 * Materialize ancillary payables onto an existing billing plan.
 * Idempotent by sourceKey. No Stripe. Safe to call from Commercial Workspace load.
 */
export async function ensurePayableSurfacesOnContract(input: {
  contractId: number;
  actor?: string;
}): Promise<{ pkg: ContractLifecyclePackage; createdCount: number }> {
  const { payload, contract, pkg } = await loadContractPackage(input.contractId);
  if (!pkg.billingPlan) {
    return { pkg, createdCount: 0 };
  }

  // loadContractPackage already hydrated+persisted ancillaries when count grew.
  // Re-check in case another path loaded without persist.
  const before = pkg.billingPlan.obligations.length;
  const nextPlan = ensurePayableSurfacesOnPlan(pkg.billingPlan, pkg.structuredPaymentTerms);
  const createdCount = nextPlan.obligations.length - before;
  if (createdCount <= 0) {
    return { pkg, createdCount: 0 };
  }

  let next: ContractLifecyclePackage = { ...pkg, billingPlan: nextPlan };
  next = appendAudit(next, {
    actor: input.actor ?? "system",
    action: "billing.ancillary-payables-materialized",
    reason: `Projected ${createdCount} ancillary payable(s) from structured payment terms.`,
  });

  await payload.update({
    collection: "contracts" as never,
    id: input.contractId,
    data: { lifecyclePackage: next } as never,
    overrideAccess: true,
  });

  // Keep contract status reference unused but available for future eligibility.
  void contract;

  return { pkg: next, createdCount };
}

export { ensurePayableSurfacesOnPlan };
