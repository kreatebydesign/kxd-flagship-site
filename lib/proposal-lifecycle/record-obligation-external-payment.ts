/**
 * Persist obligation-level external payment (Cash App, etc.) on a contract lifecycle package.
 * Never calls Stripe. Never marks payments received without explicit operator confirmation.
 */

import { getPayload } from "payload";
import config from "@payload-config";
import {
  applyObligationExternalPayment,
  type RecordObligationExternalPaymentInput,
} from "./external-obligation-payment.ts";
import { normalizeLifecyclePackage } from "./package.ts";
import type { ContractLifecyclePackage } from "./types.ts";

type AnyDoc = Record<string, unknown> & { id: number };

export async function recordObligationExternalPaymentOnContract(
  input: RecordObligationExternalPaymentInput & { contractId: number },
): Promise<{ pkg: ContractLifecyclePackage; idempotentReplay: boolean }> {
  const payload = await getPayload({ config });
  const contract = (await payload.findByID({
    collection: "contracts" as never,
    id: input.contractId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
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

  const { applyOnboardingEligibility } = await import("./onboarding-eligibility.ts");
  const { appendAudit } = await import("./package.ts");
  let next = applyOnboardingEligibility(applied.pkg, String(contract.status ?? ""));
  if (next.onboardingEligible && !pkg.onboardingEligible) {
    next = appendAudit(next, {
      actor: "system",
      action: "onboarding.eligible",
      reason: "Executed contract + verified initial obligation payment.",
    });
  }

  if (!applied.idempotentReplay) {
    await payload.update({
      collection: "contracts" as never,
      id: input.contractId,
      data: { lifecyclePackage: next } as never,
      overrideAccess: true,
    });
  }

  return { pkg: next, idempotentReplay: applied.idempotentReplay };
}
