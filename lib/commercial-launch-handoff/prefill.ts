/**
 * Build Launch Wizard prefill from a modern commercial contract lifecycle package.
 * Never invents ambiguous commercial values — leaves them for operator confirmation.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import { emptyLaunchWizardPayload } from "@/lib/client-launch-wizard/draft/empty";
import { resolvePackageModuleSelections } from "@/lib/client-launch-wizard/packages/resolve";
import { normalizeClientSlug } from "@/lib/client-launch-wizard/validation/identity";
import type { LaunchWizardDraftPayload } from "@/lib/client-launch-wizard/types";
import { getContractLifecycle } from "@/lib/proposal-lifecycle/services";
import { HANDOFF_READY_CES_MODULES } from "./ready-modules";
import type { CommercialLaunchHandoffSource } from "./types";

function asId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function centsToDollars(cents: number | null | undefined): number | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  return Math.round(cents) / 100;
}

export type PrefillFromCommercialResult = {
  payload: LaunchWizardDraftPayload;
  source: CommercialLaunchHandoffSource;
  warnings: string[];
  onboardingEligible: boolean;
  companyName: string;
};

export async function buildLaunchPrefillFromContract(
  contractId: number,
): Promise<PrefillFromCommercialResult> {
  const { contract, pkg, canonical } = await getContractLifecycle(contractId);
  const warnings: string[] = [];

  if (!pkg.onboardingEligible) {
    warnings.push(
      "This agreement is not marked onboarding-eligible yet. Confirm eligibility before launching.",
    );
  }

  const sourceClientId = asId(contract.client);
  const proposalId = asId(contract.proposal);

  const orgName =
    pkg.clientBillingIdentity?.legalName?.trim() ||
    canonical?.primaryOrganization?.trim() ||
    (typeof contract.client === "object" &&
    contract.client &&
    "name" in contract.client
      ? String((contract.client as { name?: string }).name ?? "").trim()
      : "") ||
    String(contract.title ?? "").trim() ||
    "";

  const contactName =
    canonical?.primaryContact?.name?.trim() ||
    String(contract.signerName ?? "").trim() ||
    pkg.clientSignature?.legalName?.trim() ||
    "";

  const contactEmail =
    canonical?.primaryContact?.email?.trim() ||
    pkg.clientBillingIdentity?.billingEmail?.trim() ||
    pkg.structuredPaymentTerms?.billingEmail?.trim() ||
    String(contract.signerEmail ?? "").trim() ||
    "";

  const contactPhone = canonical?.primaryContact?.phone?.trim() || "";

  if (!orgName) {
    warnings.push("Company name was not found on the commercial record — confirm Identity.");
  }
  if (!contactEmail) {
    warnings.push("Primary contact email was not found — confirm Team before launch.");
  }

  const setupFee = centsToDollars(
    pkg.structuredPaymentTerms?.oneTimeTotalCents ??
      pkg.structuredPaymentTerms?.depositCents ??
      pkg.billingPlan?.oneTimeTotalCents ??
      null,
  );
  const monthly = centsToDollars(
    pkg.structuredPaymentTerms?.monthlyTotalCents ??
      pkg.structuredPaymentTerms?.recurring?.amountCents ??
      pkg.billingPlan?.monthlyTotalCents ??
      null,
  );

  // Deterministic ready surface for new website/service clients.
  // Operator may expand modules in the wizard after confirming readiness.
  const packageId = "starter" as const;
  const moduleSelections = resolvePackageModuleSelections(packageId).map((row) => ({
    ...row,
    selected: isReadySelected(row.moduleId),
  }));
  if (!moduleSelections.some((m) => m.moduleId === "website-review" && m.selected)) {
    const existing = moduleSelections.find((m) => m.moduleId === "website-review");
    if (existing) existing.selected = true;
    else {
      moduleSelections.push({
        moduleId: "website-review",
        selected: true,
        source: "custom-override",
      });
    }
  }

  const slugBase = orgName || `client-${contractId}`;
  const payload = emptyLaunchWizardPayload();
  payload.identity = {
    businessName: orgName,
    clientSlug: normalizeClientSlug(slugBase),
    primaryContactName: contactName,
    primaryContactEmail: contactEmail,
    phone: contactPhone,
    companyWebsite: "",
    industry: "",
    serviceRegion: "",
    internalNotes: [
      `Commercial handoff from contract #${contractId}.`,
      proposalId != null ? `Proposal #${proposalId}.` : null,
      pkg.onboardingEligibleAt
        ? `Onboarding eligible at ${pkg.onboardingEligibleAt}.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  };

  payload.package = {
    packageId,
    displayName: String(contract.title ?? "KXD Partnership").trim() || "KXD Partnership",
    commercialAgreementId: "custom-legacy",
    monthlyStarting: monthly,
    setupFee,
    monthlyServiceCredits: null,
    approvedAddOnIds: [],
    commercialNotes: [
      `Linked contract #${contractId}.`,
      setupFee == null ? "Setup fee not detected — confirm package amounts." : null,
      monthly == null ? "Monthly amount not detected — confirm package amounts." : null,
    ]
      .filter(Boolean)
      .join(" "),
  };

  if (setupFee == null || monthly == null) {
    warnings.push("Some commercial amounts were missing — confirm Package step.");
  }

  payload.modules = moduleSelections;
  payload.automation = {
    reportingAutomationEnabled: false,
    syncHourPacific: 5,
    entitledProviders: [],
    executiveBriefingPreferred: false,
  };

  if (contactEmail) {
    payload.team = [
      {
        id: randomUUID(),
        name: contactName || contactEmail,
        email: contactEmail.toLowerCase(),
        role: "owner",
        isPrimaryContact: true,
        inviteOnLaunch: true,
      },
    ];
  } else {
    payload.team = [];
  }

  payload.commercialHandoff = {
    contractId,
    proposalId,
    sourceClientId,
    reuseExistingClient: sourceClientId != null,
  };

  return {
    payload,
    source: {
      contractId,
      proposalId,
      sourceClientId,
      reuseExistingClient: sourceClientId != null,
    },
    warnings,
    onboardingEligible: Boolean(pkg.onboardingEligible),
    companyName: orgName,
  };
}

function isReadySelected(moduleId: string): boolean {
  return HANDOFF_READY_CES_MODULES.includes(moduleId as never);
}
