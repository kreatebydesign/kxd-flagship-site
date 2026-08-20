/**
 * Signature-readiness checks for proposal-generated contracts.
 * Blocks Approve for signature when required commercial/legal configuration is unresolved.
 */

import type { ContractLegalProvisions } from "../proposal-builder/types.ts";
import { GOVERNING_LAW_PENDING_CONFIGURATION } from "./standard-contract-provisions.ts";

export type SignatureReadinessIssue = {
  code: string;
  severity: "blocker" | "warning";
  field: string;
  message: string;
};

export type LegalJurisdictionConfig = {
  governingLawState?: string | null;
  venueCounty?: string | null;
  venueState?: string | null;
};

/** Optional env-backed jurisdiction. Never invent a default state. */
export function readLegalJurisdictionConfig(
  env: NodeJS.ProcessEnv = process.env,
): LegalJurisdictionConfig {
  return {
    governingLawState: trimOrNull(env.KXD_GOVERNING_LAW_STATE),
    venueCounty: trimOrNull(env.KXD_VENUE_COUNTY),
    venueState: trimOrNull(env.KXD_VENUE_STATE),
  };
}

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export function isGoverningLawConfigured(config: LegalJurisdictionConfig): boolean {
  return Boolean(config.governingLawState);
}

function formatVenueLocation(county: string | null | undefined, venueState: string): string {
  const c = county?.trim();
  if (!c) return venueState;
  const countyLabel = /county$/i.test(c) ? c : `${c} County`;
  return `${countyLabel}, ${venueState}`;
}

export function formatGoverningLawClause(config: LegalJurisdictionConfig): string {
  if (!isGoverningLawConfigured(config)) {
    return GOVERNING_LAW_PENDING_CONFIGURATION;
  }
  const state = config.governingLawState!.trim();
  const venueState = (config.venueState || state).trim();
  const venueLocation = formatVenueLocation(config.venueCounty, venueState);
  return [
    `This Agreement is governed by the laws of the State of ${state}, without regard to conflict-of-law rules.`,
    `The parties consent to exclusive venue in the state or federal courts located in ${venueLocation}, subject to applicable law.`,
  ].join(" ");
}

export function assessContractSignatureReadiness(input: {
  legal?: ContractLegalProvisions | null;
  body?: string | null;
  jurisdiction?: LegalJurisdictionConfig;
  recurringStartPending?: boolean;
}): { ok: boolean; blockers: SignatureReadinessIssue[]; warnings: SignatureReadinessIssue[] } {
  const blockers: SignatureReadinessIssue[] = [];
  const warnings: SignatureReadinessIssue[] = [];
  const jurisdiction = input.jurisdiction ?? readLegalJurisdictionConfig();
  const body = String(input.body ?? "");
  const legalText = JSON.stringify(input.legal ?? {});

  if (!isGoverningLawConfigured(jurisdiction)) {
    blockers.push({
      code: "GOVERNING_LAW_UNRESOLVED",
      severity: "blocker",
      field: "governingLaw",
      message:
        "Governing law / venue is not configured in KXD OS. Set KXD_GOVERNING_LAW_STATE (and optional venue fields) before Approve for signature.",
    });
  }

  if (/\[DRAFT — review required\]/i.test(body) || /\[DRAFT — review required\]/i.test(legalText)) {
    blockers.push({
      code: "RAW_DRAFT_PLACEHOLDER",
      severity: "blocker",
      field: "legalProvisions",
      message: "Contract still contains raw internal draft placeholders and cannot be approved for signature.",
    });
  }

  if (input.recurringStartPending) {
    warnings.push({
      code: "RECURRING_START_PENDING",
      severity: "warning",
      field: "recurringService.startBillingDate",
      message:
        "Recurring service start/billing date is pending confirmation. Confirm before final signature package.",
    });
  }

  return { ok: blockers.length === 0, blockers, warnings };
}

/** True when recurring commencement still needs a calendar date or operator confirmation. */
export function isRecurringStartPending(status?: string | null): boolean {
  return status === "pending-confirmation";
}

export function assertContractReadyForSignature(input: {
  legal?: ContractLegalProvisions | null;
  body?: string | null;
  jurisdiction?: LegalJurisdictionConfig;
}): void {
  const result = assessContractSignatureReadiness(input);
  if (!result.ok) {
    const detail = result.blockers.map((b) => b.message).join(" ");
    throw new Error(`Contract cannot be approved for signature: ${detail}`);
  }
}
