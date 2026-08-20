/**
 * Onboarding eligibility for proposal-linked commercial contracts.
 * Rule: fully executed contract AND verified initial obligation payment.
 */

import type { ContractLifecyclePackage } from "./types.ts";

export function isContractFullyExecuted(
  contractStatus: string | null | undefined,
  pkg: ContractLifecyclePackage,
): boolean {
  if (pkg.executedCertificate) return true;
  const status = String(contractStatus ?? "");
  return status === "executed";
}

export function isInitialObligationPaid(pkg: ContractLifecyclePackage): boolean {
  const initial = pkg.billingPlan?.obligations?.find((o) => o.kind === "initial");
  return Boolean(initial && initial.status === "paid");
}

/**
 * Recompute onboarding eligibility from current contract + package state.
 * Payment alone or execution alone never unlocks launch.
 */
export function recomputeOnboardingEligibility(input: {
  contractStatus: string | null | undefined;
  pkg: ContractLifecyclePackage;
}): { eligible: boolean; reason: string } {
  const executed = isContractFullyExecuted(input.contractStatus, input.pkg);
  const initialPaid = isInitialObligationPaid(input.pkg);

  if (executed && initialPaid) {
    return {
      eligible: true,
      reason: "Executed contract + verified initial obligation payment.",
    };
  }
  if (!executed && initialPaid) {
    return {
      eligible: false,
      reason: "Initial payment verified, but contract is not fully executed yet.",
    };
  }
  if (executed && !initialPaid) {
    return {
      eligible: false,
      reason: "Contract executed, but initial obligation is not verified paid.",
    };
  }
  return {
    eligible: false,
    reason: "Contract not executed and initial obligation not verified paid.",
  };
}

/** Apply eligibility onto a package without inventing payment or execution. */
export function applyOnboardingEligibility(
  pkg: ContractLifecyclePackage,
  contractStatus: string | null | undefined,
  at: string = new Date().toISOString(),
): ContractLifecyclePackage {
  const { eligible } = recomputeOnboardingEligibility({ contractStatus, pkg });
  if (eligible === Boolean(pkg.onboardingEligible)) {
    return {
      ...pkg,
      onboardingEligible: eligible,
      onboardingEligibleAt: eligible
        ? pkg.onboardingEligibleAt ?? at
        : pkg.onboardingEligibleAt ?? null,
    };
  }
  return {
    ...pkg,
    onboardingEligible: eligible,
    onboardingEligibleAt: eligible ? at : pkg.onboardingEligibleAt ?? null,
  };
}
