import {
  COMMERCIAL_SECTIONS,
  type CommercialSectionId,
} from "./types";

export const COMMERCIAL_SECTION_LABELS: Record<CommercialSectionId, string> = {
  overview: "Overview",
  proposals: "Proposals",
  agreements: "Agreements",
  invoices: "Invoices",
  payments: "Payments",
  receipts: "Receipts",
  authorizations: "Authorizations",
  documents: "Documents",
  timeline: "Timeline",
};

/** Legacy client-command tabs → Commercial section. */
export const LEGACY_COMMERCIAL_TAB_REDIRECTS: Record<string, CommercialSectionId> = {
  contracts: "agreements",
  proposals: "proposals",
  invoices: "invoices",
  financial: "overview",
  retainers: "overview",
};

export function isCommercialSectionId(value: string | undefined | null): value is CommercialSectionId {
  return Boolean(value && (COMMERCIAL_SECTIONS as readonly string[]).includes(value));
}

export function resolveCommercialSection(value: string | undefined | null): CommercialSectionId {
  return isCommercialSectionId(value) ? value : "overview";
}

export function commercialWorkspaceHref(
  clientId: number,
  section: CommercialSectionId = "overview",
): string {
  const base = `/admin/operations/client-command/${clientId}`;
  if (section === "overview") return `${base}?tab=commercial`;
  return `${base}?tab=commercial&section=${section}`;
}

export function commercialAgreementHref(clientId: number, contractId: number): string {
  return `/admin/operations/client-command/${clientId}/commercial/agreements/${contractId}`;
}
