/**
 * Client-facing presentation helpers for proposal preview / PDF / public views.
 * Display only — does not change stored totals or commercial records.
 */

import type { ProposalOrganization } from "./types.ts";

function comparableLabel(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Cover identity: keep the primary organization once, then any additional
 * distinct organization names. Consecutive or identical duplicates are omitted.
 */
export function coverOrganizationPresentation(
  primaryOrganization: string | null | undefined,
  organizations: Array<Pick<ProposalOrganization, "name">> | null | undefined,
): {
  preparedFor: string;
  additionalOrganizations: string[];
} {
  const preparedFor = String(primaryOrganization ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const seen = new Set<string>();
  if (preparedFor) seen.add(comparableLabel(preparedFor));

  const additionalOrganizations: string[] = [];
  for (const org of organizations ?? []) {
    const name = String(org.name ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (!name) continue;
    const key = comparableLabel(name);
    if (seen.has(key)) continue;
    seen.add(key);
    additionalOrganizations.push(name);
  }

  return { preparedFor, additionalOrganizations };
}

export function formatCoverPreparedForLine(
  primaryOrganization: string | null | undefined,
  organizations: Array<Pick<ProposalOrganization, "name">> | null | undefined,
): string {
  const { preparedFor, additionalOrganizations } = coverOrganizationPresentation(
    primaryOrganization,
    organizations,
  );
  const names = [preparedFor, ...additionalOrganizations].filter(Boolean);
  if (names.length === 0) return "";
  return `Prepared for ${names.join(" · ")}`;
}

/** Recurring investment rows belong only when there is an actual recurring amount. */
export function shouldShowRecurringInvestment(amountCents: number | null | undefined): boolean {
  return Number(amountCents) > 0;
}

/** Omit a scope organization label when it repeats the primary prepared-for name. */
export function distinctScopeOrganizationName(
  organizationName: string | null | undefined,
  primaryOrganization: string | null | undefined,
): string | null {
  const name = String(organizationName ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!name) return null;
  const primary = String(primaryOrganization ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (primary && comparableLabel(name) === comparableLabel(primary)) return null;
  return name;
}
