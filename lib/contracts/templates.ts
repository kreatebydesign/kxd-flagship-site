import type { ContractMergeContext } from "./types";

const MERGE_PATTERN = /\{\{(\w+)\}\}/g;

export function applyContractMergeFields(
  template: string,
  context: ContractMergeContext,
): string {
  return template.replace(MERGE_PATTERN, (_match, key: string) => {
    const value = context[key as keyof ContractMergeContext];
    return value ?? "";
  });
}

export function buildContractMergeContext(input: {
  clientName: string;
  businessName?: string;
  services?: string;
  pricing?: string;
  terms?: string;
  startDate?: string | Date | null;
  monthlyAmount?: number | null;
  projectAmount?: number | null;
  executiveName?: string;
}): ContractMergeContext {
  const start =
    input.startDate instanceof Date
      ? input.startDate.toLocaleDateString("en-US")
      : input.startDate
        ? new Date(input.startDate).toLocaleDateString("en-US")
        : new Date().toLocaleDateString("en-US");

  return {
    clientName: input.clientName,
    businessName: input.businessName ?? input.clientName,
    services: input.services ?? "As outlined in the approved proposal.",
    pricing: input.pricing ?? "Per approved proposal investment schedule.",
    terms: input.terms ?? "Standard Kreate by Design service terms apply.",
    startDate: start,
    monthlyAmount:
      input.monthlyAmount != null
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
            input.monthlyAmount,
          )
        : "—",
    projectAmount:
      input.projectAmount != null
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
            input.projectAmount,
          )
        : "—",
    executiveName: input.executiveName ?? "Kreate by Design",
  };
}

export function proposalTypeToContractType(
  proposalType: string | null | undefined,
): string {
  const map: Record<string, string> = {
    website: "website-agreement",
    branding: "service-agreement",
    "marketing-retainer": "marketing-retainer",
    "crm-automation": "crm-agreement",
    consulting: "consulting",
    "one-time-project": "service-agreement",
    "monthly-retainer": "monthly-retainer",
    custom: "custom",
  };
  return map[proposalType ?? ""] ?? "service-agreement";
}

export function formatPricingSummary(input: {
  oneTime?: number | null;
  recurring?: number | null;
}): string {
  const parts: string[] = [];
  if (input.oneTime != null && input.oneTime > 0) {
    parts.push(
      `One-time: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.oneTime)}`,
    );
  }
  if (input.recurring != null && input.recurring > 0) {
    parts.push(
      `Monthly: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.recurring)}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "Per approved proposal.";
}
