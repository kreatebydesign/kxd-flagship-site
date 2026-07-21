/**
 * Central commercial agreement definitions for internal launch operations.
 * Prices and credit capacities match the approved public /pricing offer exactly.
 * Inventory + Public Showroom is never included by default.
 */

import {
  PARTNERSHIP_ADD_ONS,
  getPartnershipPackage,
} from "@/lib/partnerships/packages";
import type {
  CommercialAddOnId,
  CommercialAgreementDefinition,
  CommercialAgreementId,
} from "./types";

const ALL_ADD_ON_IDS = PARTNERSHIP_ADD_ONS.map(
  (addon) => addon.id,
) as CommercialAddOnId[];

function fromPublicPackage(
  publicId: "partnership" | "operating" | "executive",
  entitlementPresetId: CommercialAgreementDefinition["entitlementPresetId"],
  extras: Pick<
    CommercialAgreementDefinition,
    "id" | "summary" | "capabilityNote" | "recommended"
  >,
): CommercialAgreementDefinition {
  const pkg = getPartnershipPackage(publicId);
  if (!pkg) {
    throw new Error(`Missing public partnership package: ${publicId}`);
  }
  return {
    id: extras.id,
    name: pkg.name,
    summary: extras.summary,
    entitlementPresetId,
    monthlyStarting: pkg.monthlyStarting,
    monthlyLabel: pkg.monthlyLabel,
    setupFee: pkg.setupFee,
    setupLabel: pkg.setupLabel,
    monthlyServiceCredits: pkg.credits,
    recommended: extras.recommended,
    publicPackageId: pkg.id,
    availableAddOnIds: ALL_ADD_ON_IDS,
    capabilityNote: extras.capabilityNote,
  };
}

export const COMMERCIAL_AGREEMENTS: readonly CommercialAgreementDefinition[] = [
  fromPublicPackage("partnership", "starter", {
    id: "kxd-partnership",
    summary:
      "Consistent website care with Website Review, organized feedback, and dependable creative support.",
    capabilityNote:
      "Capability baseline: Starter (Website Review). Inventory and other add-ons stay off until explicitly approved.",
  }),
  fromPublicPackage("operating", "growth", {
    id: "kxd-operating",
    recommended: true,
    summary:
      "Active websites with recurring requests, Website Workspace readiness, and stronger operating support.",
    capabilityNote:
      "Capability baseline: Growth (Website Review + search/analytics readiness). Recommended default for a typical active client.",
  }),
  fromPublicPackage("executive", "premium", {
    id: "kxd-executive",
    summary:
      "Deeper creative leadership, executive performance visibility, and priority access.",
    capabilityNote:
      "Capability baseline: Premium (Website Review + Executive Performance + reporting entitlements). Specialized add-ons still require explicit approval.",
  }),
  {
    id: "custom-legacy",
    name: "Custom / Legacy Agreement",
    summary:
      "Preserved or negotiated terms. No invented price or credit capacity — enter values deliberately.",
    entitlementPresetId: "custom",
    monthlyStarting: null,
    monthlyLabel: null,
    setupFee: null,
    setupLabel: null,
    monthlyServiceCredits: null,
    publicPackageId: null,
    availableAddOnIds: ALL_ADD_ON_IDS,
    capabilityNote:
      "Select entitlement modules deliberately. Existing clients with legacy plan status are not altered by these definitions.",
  },
] as const;

export const COMMERCIAL_AGREEMENT_IDS = COMMERCIAL_AGREEMENTS.map(
  (row) => row.id,
) as CommercialAgreementId[];

export function getCommercialAgreement(
  id: string | null | undefined,
): CommercialAgreementDefinition | null {
  if (!id) return null;
  return COMMERCIAL_AGREEMENTS.find((row) => row.id === id) ?? null;
}

export function listCommercialAgreements(): readonly CommercialAgreementDefinition[] {
  return COMMERCIAL_AGREEMENTS;
}

export function isCommercialAgreementId(
  value: string | null | undefined,
): value is CommercialAgreementId {
  return Boolean(value && COMMERCIAL_AGREEMENT_IDS.includes(value as CommercialAgreementId));
}

/** Server-side guard: standard agreements may not invent prices or credits. */
export function assertCommercialBaselineMatches(
  agreementId: CommercialAgreementId,
  input: {
    monthlyStarting: number | null;
    setupFee: number | null;
    monthlyServiceCredits: number | null;
  },
): { ok: true } | { ok: false; message: string } {
  const agreement = getCommercialAgreement(agreementId);
  if (!agreement) {
    return { ok: false, message: "Unknown commercial agreement." };
  }
  if (agreementId === "custom-legacy") {
    return { ok: true };
  }
  if (input.monthlyStarting !== agreement.monthlyStarting) {
    return {
      ok: false,
      message: `Monthly starting price must be ${agreement.monthlyStarting} for ${agreement.name}.`,
    };
  }
  if (input.setupFee !== agreement.setupFee) {
    return {
      ok: false,
      message: `Setup fee must be ${agreement.setupFee} for ${agreement.name}.`,
    };
  }
  if (input.monthlyServiceCredits !== agreement.monthlyServiceCredits) {
    return {
      ok: false,
      message: `Monthly service credits must be ${agreement.monthlyServiceCredits} for ${agreement.name}.`,
    };
  }
  return { ok: true };
}

/** Inventory is never auto-approved with a base partnership. */
export function sanitizeApprovedAddOnIds(
  agreementId: CommercialAgreementId,
  requested: readonly string[] | null | undefined,
): CommercialAddOnId[] {
  const agreement = getCommercialAgreement(agreementId);
  const allowed = new Set(agreement?.availableAddOnIds ?? ALL_ADD_ON_IDS);
  const unique = [...new Set(requested ?? [])];
  return unique.filter((id): id is CommercialAddOnId =>
    allowed.has(id as CommercialAddOnId),
  );
}

export function commercialAddOnLabel(id: string): string {
  return PARTNERSHIP_ADD_ONS.find((row) => row.id === id)?.name ?? id;
}

/** Map public inquiry package ids onto commercial agreements. */
export function commercialAgreementFromPublicPackage(
  publicId: string | null | undefined,
): CommercialAgreementId | null {
  if (publicId === "partnership") return "kxd-partnership";
  if (publicId === "operating") return "kxd-operating";
  if (publicId === "executive") return "kxd-executive";
  return null;
}

export function publicPackageFromCommercialAgreement(
  agreementId: CommercialAgreementId,
): "partnership" | "operating" | "executive" | null {
  return getCommercialAgreement(agreementId)?.publicPackageId ?? null;
}
